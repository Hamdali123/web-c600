import { PrismaClient } from '@prisma/client';
const { executeOltCommand } = require('./src/lib/oltConnection');

const prisma = new PrismaClient();

async function main() {
  const olts = await prisma.oLTDevice.findMany();
  if (olts.length === 0) {
    console.error("No OLT device configured in the database.");
    return;
  }

  const olt = olts[0];
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
    // 1. Get all configured ONU indexes and states
    const stateOutput = await executeOltCommand(creds, 'show gpon onu state');
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

    let importedCount = 0;

    // 2. Fetch baseinfo (containing SN and Type) for each PON port
    for (const port of uniquePorts) {
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
                vlan: '1', // Default VLAN
                mode: 'route', // Default Mode
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
