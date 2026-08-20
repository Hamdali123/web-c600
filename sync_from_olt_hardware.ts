import { PrismaClient } from '@prisma/client';
const { executeOltCommand, fetchOltRunningConfig } = require('./src/lib/oltConnection');

const prisma = new PrismaClient();

async function main() {
  const olts = await prisma.oLTDevice.findMany();
  if (olts.length === 0) {
    console.error("No OLT device configured in the database.");
    return;
  }

  const targetId = parseInt(process.argv[2] || '');
  const olt = (targetId ? olts.find(o => o.id === targetId) : undefined) || olts[0];
  const creds = {
    ip: olt.ip_address,
    port: olt.telnet_port || 23,
    username: olt.telnet_user || '',
    password: olt.telnet_pass || '',
    protocol: (olt.protocol as any) || 'telnet',
    vendor: (olt.vendor as any) || 'zte'
  };

    console.log(`[Hardware Sync] Connecting to OLT ${olt.name} (${olt.ip_address}:${olt.telnet_port})...`);
    
    try {
    // 1. Get all configured ONU indexes and states using raw TCP to avoid telnet-client truncation
    const stateOutput = await new Promise<string>((resolve, reject) => {
        const net = require('net');
        const sock = new net.Socket();
        sock.connect(olt.telnet_port || 23, olt.ip_address, () => {});
        let buffer = '';
        let loggedIn = false;
        let cmdSent = false;
        sock.on('data', (d: any) => {
            const s = d.toString();
            buffer += s;
            if (!loggedIn && s.includes('Username:')) {
                sock.write((olt.telnet_user || '') + '\n');
            } else if (!loggedIn && s.includes('Password:')) {
                sock.write((olt.telnet_pass || '') + '\n');
            } else if (!loggedIn && s.includes('#')) {
                loggedIn = true;
                sock.write('terminal length 0\n');
            } else if (loggedIn && !cmdSent && s.includes('#')) {
                cmdSent = true;
                sock.write('show gpon onu state\n');
                buffer = ''; 
            } else if (cmdSent) {
                if (s.includes('#')) {
                    sock.destroy();
                    resolve(buffer);
                } else if (s.includes('---- More (')) {
                    sock.write(' ');
                }
            }
        });
        sock.on('error', reject);
    });
    
    const stateLines = stateOutput.split('\n');
    
    // Parse ONU indexes: format is slot/port/onu_id (e.g. 1/2/1:3)
    const onuIndexes: { port: string; onuId: string; status: string }[] = [];
    const uniquePorts = new Set<string>();

    for (const line of stateLines) {
      // Look for format: 1/2/1:3
      const match = line.trim().match(/^(\d+\/\d+\/\d+):(\d+)\s+\w+\s+\w+\s+(\w+)/i);
      if (match) {
        const port = match[1];
        const onuId = match[2];
        const phaseState = match[3].toLowerCase();
        const status = phaseState === 'working' ? 'Online' : 'Offline';
        
        onuIndexes.push({ port, onuId, status });
        uniquePorts.add(port);
      }
    }

    console.log(`[Hardware Sync] Found ${onuIndexes.length} ONUs configured across ${uniquePorts.size} PON ports.`);

    // 1b. Delete DB records whose ONU is no longer registered on the physical OLT
    // (stale records, e.g. ONUs removed from hardware but still in DB — they would
    // otherwise cause wrong onu_id allocation for new ONUs). Only touches records
    // belonging to this OLT.
    const dbOnus = await prisma.oNUConfigured.findMany({ where: { olt_id: olt.id } });
    const stale = dbOnus.filter(o => {
      if (!o.pon_port || !o.onu_id) return false;
      const match = o.pon_port.match(/gpon[-_]?olt[-_]?(\d+\/\d+\/\d+)/i);
      if (!match) return false;
      const p = match[1];
      const s = onuIndexes.find(x => x.port === p && x.onuId === o.onu_id);
      return !s;
    });
    if (stale.length > 0) {
      console.log(`[Hardware Sync] Removing ${stale.length} stale DB records not present on OLT:`);
      for (const s of stale) {
        console.log(`  - #${s.id} ${s.name} (${s.sn_mac}) ${s.pon_port}:${s.onu_id}`);
        await prisma.oNUConfigured.delete({ where: { id: s.id } });
      }
    } else {
      console.log('[Hardware Sync] No stale DB records to remove.');
    }

    let importedCount = 0;

    // 2. Fetch the running config once to read the real VLAN and WAN mode of
    // each ONU (e.g. 'service 1 gemport 1 vlan 125' for bridge ONUs or
    // 'wan-ip ipv4 mode pppoe ... vlan-profile SMARTO_LT_VLAN_125' for route
    // ONUs) instead of writing hardcoded defaults.
    const onuVlans: Record<string, string> = {};
    const onuModes: Record<string, string> = {};
    try {
        const runningConfig = await fetchOltRunningConfig(creds, 8000);
        let curKey = '';
        for (const line of runningConfig.split('\n')) {
            const mg = line.trim().match(/^pon-onu-mng gpon_onu-(\d+\/\d+\/\d+):(\d+)/);
            if (mg) { curKey = `${mg[1]}:${mg[2]}`; continue; }
            if (line.trim() === '$' || line.trim() === 'exit') { curKey = ''; continue; }
            if (!curKey) continue;
            const sv = line.trim().match(/^service \S+ gemport 1 vlan (\d+)/);
            if (sv) onuVlans[curKey] = sv[1];
            const wm = line.trim().match(/^wan-ip ipv4 mode (pppoe|dhcp|static)/);
            if (wm) onuModes[curKey] = 'route';
            if (!onuVlans[curKey]) {
                const vp = line.trim().match(/vlan-profile\s+\S*[_\s-]?VLAN[_\s-]?(\d+)/i) ||
                           line.trim().match(/vlan-profile\s+\S*_(\d+)\b/);
                if (vp) onuVlans[curKey] = vp[1];
            }
        }
        console.log(`[Hardware Sync] Read ${Object.keys(onuVlans).length} per-ONU VLANs from running config.`);
    } catch (e: any) {
        console.error('[Hardware Sync] Failed to read running config VLANs:', e.message);
    }

    // 3. Fetch baseinfo (containing SN and Type) for each PON port
    for (const port of Array.from(uniquePorts)) {
      console.log(`[Hardware Sync] Querying baseinfo for port gpon_olt-${port}...`);
      const baseinfoOutput = await executeOltCommand(creds, `show gpon onu baseinfo gpon_olt-${port}`);
      const baseinfoLines = baseinfoOutput.split('\n');

      for (const line of baseinfoLines) {
        // Parse format: gpon_onu-1/2/1:1    ALL         sn      SN:ZTEGD77D5808         ready
        const match = line.trim().match(/^gpon_onu-(\d+\/\d+\/\d+):(\d+)\s+(\S+)\s+\w+\s+SN:(\S+)\s+(\w+)/i);
        if (match) {
          const matchPort = match[1];
          const onuId = match[2];
          const type = match[3];
          const sn = match[4];

          // Find status from the state output list
          const stateObj = onuIndexes.find(o => o.port === matchPort && o.onuId === onuId);
          const status = stateObj ? stateObj.status : 'Offline';

          const dbPonPort = `gpon-olt_${matchPort}`;
          const realVlan = onuVlans[`${matchPort}:${onuId}`] || '1';
          const realMode = onuModes[`${matchPort}:${onuId}`] || 'bridge';

          // Check if this ONU is already in the database by SN MAC first, since it's unique
          let existing = await prisma.oNUConfigured.findUnique({
            where: {
              sn_mac: sn
            }
          });

          // If not found by SN, try checking if something exists on that port (shouldn't happen often if SN is unique, but fallback)
          if (!existing) {
             existing = await prisma.oNUConfigured.findFirst({
               where: {
                 olt_id: olt.id,
                 pon_port: dbPonPort,
                 onu_id: onuId
               }
             });
          }

          const defaultName = `ONU-${matchPort}:${onuId}`;

          if (existing) {
            await prisma.oNUConfigured.update({
              where: { id: existing.id },
              data: {
                sn_mac: sn,
                status: status,
                pon_port: dbPonPort,
                onu_id: onuId,
                // Only update name if it starts with default ONU prefix to preserve custom names
                name: existing.name.startsWith('ONU-') ? defaultName : existing.name
              }
            });
          } else {
            await prisma.oNUConfigured.create({
              data: {
                sn_mac: sn,
                name: defaultName,
                olt_id: olt.id,
                pon_port: dbPonPort,
                onu_id: onuId,
                vlan: realVlan,
                mode: realMode,
                status: status
              }
            });
          }
          importedCount++;
        }
      }
    }

    console.log(`\n🎉 [Hardware Sync] SUCCESS! Loaded ${importedCount} ONUs from OLT hardware into database.`);
  } catch (e: any) {
    console.error("[Hardware Sync] Error:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
