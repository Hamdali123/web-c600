import cron from 'node-cron';
import { executeOltCommand, OltCredentials, readOltAttenuation, getOltMetrics, getOnuDetails } from './oltConnection';
import prisma from './prisma';
import { createNotification } from './notifications';

// 1. Radar: Mengecek OLT untuk ONU baru (Setiap 1 menit)
cron.schedule('* * * * *', async () => {
    try {
        const olts = await prisma.oLTDevice.findMany();

        for (const olt of olts) {
            const creds: OltCredentials = {
                ip: olt.ip_address,
                port: olt.telnet_port || (olt.protocol === 'ssh' ? 22 : 23),
                username: olt.telnet_user || '',
                password: olt.telnet_pass || '',
                protocol: (olt.protocol as any) || 'telnet',
                vendor: (olt.vendor as any) || 'zte'
            };

            if (creds.vendor === 'zte') {
                try {
                    const output = await executeOltCommand(creds, 'show gpon onu uncfg');
                    const lines = output.split('\n');
                    for (const line of lines) {
                        const match = line.match(/(gpon-olt_\d+\/\d+\/\d+):(\d+)\s+(ZTEG[A-Z0-9]+)/i);
                        if (match) {
                            const port = match[1];
                            const onuId = match[2];
                            const sn = match[3];

                            const exists = await prisma.oNUUnconfigured.findUnique({ where: { sn_mac: sn } });
                            if (!exists) {
                                await prisma.oNUUnconfigured.create({
                                    data: {
                                        sn_mac: sn,
                                        olt_id: olt.id,
                                        pon_port: port,
                                        onu_id: onuId
                                    }
                                });
                                console.log(`[Radar] Ditemukan ONU Baru! SN: ${sn} di Port: ${port}`);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[Radar] Gagal scan OLT ${olt.name}:`, e);
                }
            }
        }
    } catch (error) {
        console.error("[Radar] Error:", error);
    }
});

// 2. Status Sync: Update status (Online/Offline) dan Sinyal ONU (Setiap 2 menit)
cron.schedule('*/2 * * * *', async () => {
    try {
        const olts = await prisma.oLTDevice.findMany();
        for (const olt of olts) {
            const creds: OltCredentials = {
                ip: olt.ip_address,
                port: olt.telnet_port || 23,
                username: olt.telnet_user || '',
                password: olt.telnet_pass || '',
                protocol: (olt.protocol as any) || 'telnet',
                vendor: (olt.vendor as any) || 'zte'
            };

            const configuredOnus = await prisma.oNUConfigured.findMany({ where: { olt_id: olt.id } });
            if (configuredOnus.length === 0) continue;

            try {
                const stateOutput = await executeOltCommand(creds, 'show gpon onu state');

                for (const onu of configuredOnus) {
                    const stateMatch = stateOutput.match(new RegExp(`${onu.pon_port}:${onu.onu_id}\\s+(\\w+)`, 'i'));
                    if (stateMatch) {
                        const state = stateMatch[1].toLowerCase();
                        const status = state === 'working' ? 'Online' : 'Offline';
                        const reason = state !== 'working' ? state : null;

                        // Update Status Utama
                        await prisma.oNUConfigured.update({
                            where: { id: onu.id },
                            data: {
                                status: status,
                                offline_reason: reason === 'working' ? null : reason
                            }
                        });

                        // Jika Online, ambil sinyal & detail
                        if (status === 'Online') {
                            try {
                                const att = await readOltAttenuation(creds, onu.pon_port || '');
                                const signal = parseFloat(att.onu_rx_power);
                                const signal_tx = parseFloat(att.onu_tx_power);

                                const details = await getOnuDetails(creds, onu.pon_port || '', onu.onu_id || '');

                                await prisma.oNUConfigured.update({
                                    where: { id: onu.id },
                                    data: {
                                        signal: isNaN(signal) ? null : signal,
                                        signal_tx: isNaN(signal_tx) ? null : signal_tx,
                                        uptime: details.uptime || null,
                                        distance: details.distance || null,
                                        voip_status: details.voip_status || 'Down',
                                        tv_status: details.tv_status || 'Down',
                                        last_online: new Date()
                                    }
                                });

                                // Record History (Setiap 5 menit)
                                const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
                                const recentHistory = await prisma.signalHistory.findFirst({
                                    where: { onu_id: onu.id, createdAt: { gte: fiveMinsAgo } }
                                });

                                if (!recentHistory && !isNaN(signal)) {
                                    await prisma.signalHistory.create({
                                        data: { onu_id: onu.id, signal: signal }
                                    });
                                }
                            } catch (e) {
                                console.error(`[Sync] Gagal ambil detail ONU ${onu.sn_mac}`);
                            }
                        } else {
                            // Notifikasi Offline
                            if (reason === 'Power Failed' || reason === 'LOS' || reason === 'dyinggasp') {
                                await createNotification(
                                    onu.id,
                                    `ONU ${onu.name} is ${status} (${reason})`,
                                    reason === 'LOS' ? 'error' : 'warning'
                                );
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`[Sync] Gagal ambil status state dari OLT ${olt.name}`);
            }
        }
    } catch (error) {
        console.error("[Sync] Error:", error);
    }
});

// 3. Hardware Metrics: Sync OLT CPU, Mem, Temp (Setiap 5 menit)
cron.schedule('*/5 * * * *', async () => {
    try {
        const olts = await prisma.oLTDevice.findMany();
        for (const olt of olts) {
            const creds: OltCredentials = {
                ip: olt.ip_address,
                port: olt.telnet_port || (olt.protocol === 'ssh' ? 22 : 23),
                username: olt.telnet_user || '',
                password: olt.telnet_pass || '',
                protocol: (olt.protocol as any) || 'telnet',
                vendor: (olt.vendor as any) || 'zte'
            };

            try {
                const metrics = await getOltMetrics(creds);
                await prisma.oLTDevice.update({
                    where: { id: olt.id },
                    data: {
                        cpu_load: metrics.cpu,
                        memory_load: metrics.mem,
                        temperature: metrics.temp,
                        last_polled: new Date()
                    }
                });
            } catch (e) {
                console.error(`[Metrics] Gagal ambil metrics OLT ${olt.name}`);
            }
        }
    } catch (error) {
        console.error("[Metrics] Error:", error);
    }
});
