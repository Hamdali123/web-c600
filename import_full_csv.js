const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting CSV import...");
    const csvData = fs.readFileSync('/home/sanwanay/smartolt_baru/SmartOLT_onus_list_2026-07-25_06_49_06.417531.csv', 'utf-8');
    const lines = csvData.split('\n');
    if (lines.length < 2) return;
    
    // Parse headers
    const headerLine = lines[0].trim();
    const headers = [];
    let currH = '';
    let inQH = false;
    for (let j = 0; j < headerLine.length; j++) {
        if (headerLine[j] === '"') inQH = !inQH;
        else if (headerLine[j] === ',' && !inQH) { headers.push(currH); currH = ''; }
        else currH += headerLine[j];
    }
    headers.push(currH);
    const h = headers.map(x => x.trim().replace(/^"|"$/g, ''));
    
    const idxSn = h.indexOf('SN');
    const idxName = h.indexOf('Name');
    const idxMode = h.indexOf('Mode');
    const idxWanMode = h.indexOf('WAN mode');
    const idxUser = h.indexOf('Username');
    const idxPass = h.indexOf('Password');
    const idxVlan = h.indexOf('Service port VLAN');
    const idxPon = h.indexOf('Port');
    const idxBoard = h.indexOf('Board');
    const idxOnu = h.indexOf('Allocated ONU');

    let updated = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuotes = !inQuotes;
            } else if (line[j] === ',' && !inQuotes) {
                cols.push(current);
                current = '';
            } else {
                current += line[j];
            }
        }
        cols.push(current);
        
        const sn_mac = cols[idxSn]?.trim().replace(/^"|"$/g, '');
        const name = cols[idxName]?.trim().replace(/^"|"$/g, '');
        const mode = cols[idxMode]?.trim().replace(/^"|"$/g, '') || "Routing";
        const wan_mode = cols[idxWanMode]?.trim().replace(/^"|"$/g, '') || "PPPoE";
        const pppoe_user = cols[idxUser]?.trim().replace(/^"|"$/g, '');
        const pppoe_pass = cols[idxPass]?.trim().replace(/^"|"$/g, '');
        const vlan = cols[idxVlan]?.trim().replace(/^"|"$/g, '');
        const port = cols[idxPon]?.trim().replace(/^"|"$/g, '');
        const board = cols[idxBoard]?.trim().replace(/^"|"$/g, '');
        const onuId = cols[idxOnu]?.trim().replace(/^"|"$/g, '');
        const signalColIdx = h.findIndex(header => header === 'Signal');
        const signalStr = signalColIdx >= 0 ? cols[signalColIdx]?.trim().replace(/^"|"$/g, '') : '';
        const signalVal = signalStr && signalStr !== '-' ? parseFloat(signalStr) : null;
        
        if (sn_mac && sn_mac !== 'SN') {
            try {
                let finalVlan = vlan;
                if (!finalVlan) {
                  finalVlan = (wan_mode === 'PPPoE' || mode === 'Routing') ? '125' : '1000';
                }

                const existing = await prisma.oNUConfigured.findUnique({
                    where: { sn_mac: sn_mac }
                });

                const dataPayload = {
                    name: name || '', 
                    vlan: finalVlan,
                    mode: mode.toLowerCase() === 'routing' ? 'route' : 'bridge',
                    wan_mode: wan_mode || 'PPPoE',
                    pppoe_user: pppoe_user || '',
                    pppoe_pass: pppoe_pass || ''
                };
                if (signalVal !== null && !isNaN(signalVal)) {
                    dataPayload.signal = signalVal;
                }

                if (existing) {
                    await prisma.oNUConfigured.update({
                        where: { id: existing.id },
                        data: dataPayload
                    });
                    updated++;
                } else {
                    const olt = await prisma.oLTDevice.findFirst();
                    if (olt) {
                        await prisma.oNUConfigured.create({
                            data: {
                                ...dataPayload,
                                olt_id: olt.id,
                                pon_port: `gpon-olt_1/${board}/${port}`, // construct port
                                onu_id: onuId || '999',
                                sn_mac: sn_mac,
                                status: 'Offline',
                                offline_reason: 'Imported from backup'
                            }
                        });
                        updated++;
                    }
                }
            } catch (e) {
                console.error("Error updating", sn_mac, e);
            }
        }
    }
    console.log(`Finished updating ${updated} records from full CSV.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
