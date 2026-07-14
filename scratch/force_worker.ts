import { PrismaClient } from '@prisma/client';
import { executeOltCommand, readOltAttenuation, getOnuDetails } from '../src/lib/oltConnection';

const prisma = new PrismaClient();

async function runSync() {
    console.log("Force running the Status Sync Worker...");
    try {
        const olts = await prisma.oLTDevice.findMany();
        for (const olt of olts) {
            const creds: any = {
                ip: olt.ip_address,
                port: olt.telnet_port || 23,
                username: olt.telnet_user || '',
                password: olt.telnet_pass || '',
                protocol: olt.protocol || 'telnet',
                vendor: olt.vendor || 'zte'
            };

            const configuredOnus = await prisma.oNUConfigured.findMany({ where: { olt_id: olt.id } });
            if (configuredOnus.length === 0) continue;

            console.log(`Connecting to ${olt.name} to sync status...`);
            try {
                const stateOutput = await executeOltCommand(creds, 'show gpon onu state');
                const stateLines = stateOutput.split('\n');

                let updatedCount = 0; console.log("State lines:", stateLines.length, stateLines.slice(-5));

                for (const onu of configuredOnus) {
                    const portNumber = (onu.pon_port || '').replace('gpon-olt_', '');
                    const targetIndex = `${portNumber}:${onu.onu_id}`;
                    
                    let state = null;
                    for (const line of stateLines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith(targetIndex + ' ') || trimmed.startsWith(targetIndex + '\t')) {
                            const parts = trimmed.split(/\s+/);
                            if (parts.length >= 6) {
                                state = parts[5].toLowerCase();
                            } else if (parts.length >= 4) {
                                state = parts[3].toLowerCase();
                            }
                            break;
                        }
                    }

                    if (!state) continue;

                    const status = state === 'working' ? 'Online' : 'Offline';
                    const reason = state !== 'working' ? state : null;

                    await prisma.oNUConfigured.update({
                        where: { id: onu.id },
                        data: {
                            status: status,
                            offline_reason: reason === 'working' ? null : reason
                        }
                    });

                    if (status === 'Online') {
                        try {
                            const onuInterface = creds.vendor === 'zte' ? `gpon_onu-${portNumber}:${onu.onu_id}` : onu.pon_port;
                            const att = await readOltAttenuation(creds, onuInterface || '');
                            const signal = parseFloat(att.onu_rx_power);
                            const signal_tx = parseFloat(att.onu_tx_power);

                            await prisma.oNUConfigured.update({
                                where: { id: onu.id },
                                data: {
                                    signal: isNaN(signal) ? null : signal,
                                    signal_tx: isNaN(signal_tx) ? null : signal_tx,
                                    last_online: new Date()
                                }
                            });
                            updatedCount++;
                            console.log(`Synced signal for ${onu.name}: ${signal} dBm`);
                        } catch (e: any) {
                            console.log(`Failed signal sync for ${onu.name}`);
                        }
                    }
                }
                console.log(`Sync completed. Successfully pulled signals for ${updatedCount} online ONUs.`);
            } catch (e) {
                console.error(`Gagal ambil status state dari OLT ${olt.name}:`, e);
            }
        }
    } catch (error) {
        console.error("Worker Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

runSync();
