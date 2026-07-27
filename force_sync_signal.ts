import { PrismaClient } from '@prisma/client';
import { executeOltCommand, OltCredentials, executeOltCommandBatch, parseOltAttenuation, parseOnuDetails } from './src/lib/oltConnection.ts';

const prisma = new PrismaClient();

async function main() {
    console.log('[Force Sync] Memulai sinkronisasi sinyal darurat...');
    const olts = await prisma.oLTDevice.findMany();
    if (olts.length === 0) return;

    for (const olt of olts) {
        const creds: OltCredentials = {
            ip: olt.ip_address,
            port: olt.telnet_port || 23,
            username: olt.telnet_user || '',
            password: olt.telnet_pass || '',
            protocol: (olt.protocol as any) || 'telnet',
            vendor: (olt.vendor as any) || 'zte'
        };

        const configuredOnus = await prisma.oNUConfigured.findMany({ 
            where: { olt_id: olt.id, status: 'Online' } 
        });

        console.log(`[Force Sync] Ditemukan ${configuredOnus.length} ONU Online di OLT ${olt.name}. Mengambil sinyal...`);

        const batchSize = 10;
        for (let i = 0; i < configuredOnus.length; i += batchSize) {
            const batch = configuredOnus.slice(i, i + batchSize);
            const commands: string[] = [];
            
            for (const onu of batch) {
                const portNumber = (onu.pon_port || '').replace('gpon-olt_', '');
                const onuInterface = `gpon_onu-${portNumber}:${onu.onu_id}`;
                commands.push(`show pon power attenuation ${onuInterface}`);
                commands.push(`show gpon onu detail-info ${onuInterface}`);
            }

            try {
                const outputs = await executeOltCommandBatch(creds, commands);
                let outputIndex = 0;
                let updatedCount = 0;

                for (const onu of batch) {
                    const attOutput = outputs[outputIndex++];
                    const detOutput = outputs[outputIndex++];
                    
                    const att = parseOltAttenuation(attOutput);
                    const details = parseOnuDetails(detOutput);
                    
                    const signal = parseFloat(att.onu_rx_power);
                    const signal_tx = parseFloat(att.onu_tx_power);
                    
                    const updateData: any = {
                        signal_tx: isNaN(signal_tx) ? null : signal_tx,
                        uptime: (details as any).uptime || null,
                        distance: details.distance || null
                    };

                    if (signal !== -40 && !isNaN(signal)) {
                        updateData.signal = signal;
                    }

                    await prisma.oNUConfigured.update({
                        where: { id: onu.id },
                        data: updateData
                    });
                    updatedCount++;
                }
                console.log(`[Force Sync] Batch ${i/batchSize + 1} selesai. Diupdate: ${updatedCount}`);
            } catch (e) {
                console.error(`[Force Sync] Gagal batch ${i/batchSize + 1}:`, e);
            }
        }
    }
    console.log('[Force Sync] Selesai!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
