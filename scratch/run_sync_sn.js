const { PrismaClient } = require('@prisma/client');
const { executeOltCommand } = require('/home/sanwanay/smartolt_baru/src/lib/oltConnection');

const prisma = new PrismaClient();

async function syncSerialNumbers() {
    const olts = await prisma.oLTDevice.findMany();
    if (olts.length === 0) return;

    const olt = olts[0];
    const creds = {
        ip: olt.ip_address,
        port: olt.telnet_port || 23,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: olt.protocol || 'telnet',
        vendor: (olt.vendor?.toLowerCase() === 'huawei' ? 'huawei' : 'zte')
    };

    console.log(`[Sync SN] Connecting to OLT ${olt.name}...`);
    try {
        const onus = await prisma.oNUConfigured.findMany({
            where: { 
                olt_id: olt.id,
                name: { startsWith: 'ONU-' }
            }
        });

        console.log(`[Sync SN] Memproses ${onus.length} ONU...`);

        const batchSize = 10;
        let updatedCount = 0;

        for (let i = 0; i < onus.length; i += batchSize) {
            const batch = onus.slice(i, i + batchSize);
            const commands = batch.map(onu => {
                if (!onu.pon_port) return '';
                const portNumber = onu.pon_port.replace('gpon-olt_', '');
                return `show gpon onu detail-info gpon_onu-${portNumber}:${onu.onu_id}`;
            }).filter(cmd => cmd !== '');

            const output = await executeOltCommand(creds, commands.join('\n'));
            
            const lines = output.split('\n');
            let currentInterface = '';
            let currentName = '';
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('ONU interface:')) {
                    currentInterface = trimmed.substring(trimmed.indexOf(':') + 1).trim(); 
                } else if (trimmed.startsWith('Name:')) {
                    const match = line.match(/Name:\s+(.+)/i);
                    if (match && !match[1].includes('********')) {
                        currentName = match[1].trim();
                    }
                } else if (trimmed.startsWith('Description:')) {
                    const match = line.match(/Description:\s+(.+)/i);
                    if (match && !currentName && !match[1].includes('********')) {
                        currentName = match[1].trim();
                    }
                } else if (trimmed.startsWith('Serial number:') && currentInterface) {
                    const sn = trimmed.split(':')[1].trim(); 
                    
                    const portMatch = currentInterface.replace('gpon_onu-', '').split(':');
                    if (portMatch.length === 2) {
                        const portNumber = portMatch[0];
                        const onuId = portMatch[1];
                        const ponPort = `gpon-olt_${portNumber}`;
                        
                        const updateData = { sn_mac: sn };
                        if (currentName) updateData.name = currentName;

                        await prisma.oNUConfigured.updateMany({
                            where: {
                                olt_id: olt.id,
                                pon_port: ponPort,
                                onu_id: onuId
                            },
                            data: updateData
                        });
                        updatedCount++;
                    }
                    currentInterface = ''; 
                    currentName = '';
                }
            }
            console.log(`[Sync SN] Batch ${Math.floor(i/batchSize) + 1} selesai. Total updated: ${updatedCount}`);
        }
        
        console.log(`[Sync SN] SELESAI! Berhasil menarik ${updatedCount} nama asli.`);
    } catch (e) {
        console.error("[Sync SN] Error:", e.message);
    }
}

syncSerialNumbers().finally(() => prisma.$disconnect());
