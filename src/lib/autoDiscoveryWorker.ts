import cron from 'node-cron';
import fs from 'fs';
import { executeOltCommand, OltCredentials, readOltAttenuation, getOltMetrics, getOnuDetails, authorizeOnu, executeOltCommandBatch, parseOltAttenuation, parseOnuDetails } from './oltConnection';
import prisma from './prisma';
import { createNotification } from './notifications';

// 1. Radar: Mengecek OLT untuk ONU baru (Setiap 1 menit)
let isUnconfiguredSyncing = false;
cron.schedule('* * * * *', async () => {
    if (isUnconfiguredSyncing) return;
    isUnconfiguredSyncing = true;
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
                    let output = await executeOltCommand(creds, 'show gpon onu uncfg').catch(() => '');
                    if (!output || output.includes('%Error') || output.includes('Invalid input')) {
                        output = await executeOltCommand(creds, 'show pon onu uncfg').catch(() => '');
                    }
                    
                    const lines = output.split('\n');
                    for (const line of lines) {
                        const match = line.match(/(?:gpon-olt_|gpon_olt-|gpon-onu_|gpon_onu-)?(\d+\/\d+\/\d+)(?::(\d+))?\s+(ZTEG[A-Z0-9]+)/i);
                        if (match) {
                            const port = 'gpon_olt-' + match[1];
                            const onuId = match[2] || '1'; // Unconfigured ONU might not have ID yet depending on firmware
                            const sn = match[3];

                            // 1. Cek apakah unconfigured ini sudah terdaftar sebelumnya
                            const existsUncfg = await prisma.oNUUnconfigured.findUnique({ where: { sn_mac: sn } });
                            const existsConfigured = await prisma.oNUConfigured.findUnique({ where: { sn_mac: sn } });

                            if (!existsConfigured && !existsUncfg) {
                                // Simpan ke database unconfigured
                                await prisma.oNUUnconfigured.create({
                                    data: {
                                        sn_mac: sn,
                                        olt_id: olt.id,
                                        pon_port: port,
                                        onu_id: onuId
                                    }
                                });
                                console.log(`[Radar] Ditemukan ONU Baru! SN: ${sn} di Port: ${port}`);

                                // 2. AUTO-AUTHORIZATION ENGINE (Mesin Autorisasi Otomatis Berdasarkan SN Pattern / Awalan ONU)
                                const presets = await prisma.authPreset.findMany();
                                const matchingPreset = presets.find(p => {
                                    const cleanPattern = (p.sn_pattern || '').replace('*', '').trim().toUpperCase();
                                    return cleanPattern && sn.toUpperCase().startsWith(cleanPattern);
                                });

                                if (matchingPreset) {
                                    console.log(`[Auto-Auth] ONU matches preset: ${matchingPreset.name}. Initiating auto-auth for SN: ${sn}`);
                                    try {
                                        const defaultOnuType = await prisma.oNUType.findFirst({
                                            where: { pon_type: 'GPON' }
                                        });

                                        const namePattern = `AUTO-${sn.slice(-4)}`;

                                        // Kirim command provisioning ke OLT
                                        await authorizeOnu(creds, {
                                            sn,
                                            portInfo: port,
                                            onuId,
                                            onuType: defaultOnuType?.name || 'ZTE-F609',
                                            vlan: Number(matchingPreset.vlan || 1),
                                            name: namePattern,
                                            mode: (matchingPreset.mode === 'bridge' ? 'bridge' : 'route'),
                                            pppoeUser: '',
                                            pppoePass: ''
                                        });

                                        // Simpan ke database ONU terkonfigurasi
                                        await prisma.oNUConfigured.create({
                                            data: {
                                                sn_mac: sn,
                                                name: namePattern,
                                                olt_id: olt.id,
                                                pon_port: port,
                                                onu_id: onuId,
                                                vlan: String(matchingPreset.vlan || "1"),
                                                mode: matchingPreset.mode,
                                                profile_id: matchingPreset.profile_id,
                                                zone_id: matchingPreset.zone_id,
                                                status: 'Online',
                                                wan_mode: 'PPPoE'
                                            }
                                        });

                                        // Hapus dari daftar unconfigured
                                        await prisma.oNUUnconfigured.deleteMany({ where: { sn_mac: sn } });

                                        // Catat log kesuksesan
                                        await prisma.activityLog.create({
                                            data: {
                                                action: 'Auto-Authorize ONU',
                                                details: `Successfully auto-authorized SN: ${sn} using preset: ${matchingPreset.name}`,
                                                status: 'Success'
                                            }
                                        });

                                        console.log(`[Auto-Auth] Sukses auto-authorisasi ONU SN: ${sn}`);
                                    } catch (e: any) {
                                        console.error(`[Auto-Auth] Gagal auto-authorisasi ONU SN: ${sn}:`, e);
                                        await prisma.activityLog.create({
                                            data: {
                                                action: 'Auto-Authorize ONU',
                                                details: `Failed to auto-authorize SN: ${sn}: ${e.message}`,
                                                status: 'Error'
                                            }
                                        });
                                    }
                                }
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
    } finally {
        isUnconfiguredSyncing = false;
    }
});

// 2. Status Sync: Update status (Online/Offline) dan Sinyal ONU (Setiap 2 menit)
let isStatusSyncing = false;
cron.schedule('*/2 * * * *', async () => {
    if (isStatusSyncing) return;
    isStatusSyncing = true;
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
                const stateLines = stateOutput.split('\n');
                
                const onlineOnus: any[] = [];

                for (const onu of configuredOnus) {
                    const portNumber = (onu.pon_port || '').replace('gpon-olt_', '');
                    const targetIndex = `${portNumber}:${onu.onu_id}`;
                    
                    let state = null;
                    for (const line of stateLines) {
                        const trimmed = line.trim();
                        // Match if line starts with the ONU index (e.g. 1/2/1:2)
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

                    // If not found in output (likely due to telnet truncation), skip updating this ONU to avoid false offlines
                    if (!state) continue;

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

                    // Jika Online, tambahkan ke list untuk dibatch
                    if (status === 'Online') {
                        onlineOnus.push({ onu, portNumber });
                    } else {
                        // Notifikasi Offline
                        const offlineReasonLower = reason?.toLowerCase() || '';
                        if (offlineReasonLower.includes('power') || offlineReasonLower.includes('los') || offlineReasonLower.includes('dyinggasp')) {
                            await createNotification(
                                onu.id,
                                `ONU ${onu.name} is ${status} (${reason})`,
                                offlineReasonLower.includes('los') ? 'error' : 'warning'
                            );
                        }
                    }
                } // End of state processing loop

                if (onlineOnus.length > 0 && creds.vendor === 'zte') {
                    const commands: string[] = [];
                    for (const { onu, portNumber } of onlineOnus) {
                        const onuInterface = `gpon_onu-${portNumber}:${onu.onu_id}`;
                        commands.push(`show pon power attenuation ${onuInterface}`);
                        commands.push(`show gpon onu detail-info ${onuInterface}`);
                    }

                    try {
                        const outputs = await executeOltCommandBatch(creds, commands);
                        let outputIndex = 0;
                        for (const { onu, portNumber } of onlineOnus) {
                            try {
                                const attOutput = outputs[outputIndex++];
                                const detOutput = outputs[outputIndex++];

                                const att = parseOltAttenuation(attOutput);
                                const details = parseOnuDetails(detOutput);

                                const signal = parseFloat(att.onu_rx_power);
                                const signal_tx = parseFloat(att.onu_tx_power);

                                const updateData: any = {
                                    signal_tx: isNaN(signal_tx) ? null : signal_tx,
                                    uptime: (details as any).uptime || null,
                                    distance: details.distance || null,
                                    voip_status: (details as any).voip_status || 'Down',
                                    tv_status: (details as any).tv_status || 'Down',
                                    last_online: new Date()
                                };

                                // Cache OLT Tx Power for PON Ports page
                                if (att.olt_tx_power !== '-40.0') {
                                    const cachePath = './pon_tx_cache.json';
                                    let cache: any = {};
                                    if (fs.existsSync(cachePath)) {
                                        try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')); } catch(e){}
                                    }
                                    const normalizedPort = onu.pon_port?.replace('gpon-olt_', 'gpon_olt-');
                                    if (normalizedPort && cache[normalizedPort] !== att.olt_tx_power) {
                                        cache[normalizedPort] = att.olt_tx_power;
                                        fs.writeFileSync(cachePath, JSON.stringify(cache));
                                    }
                                }

                                if (signal !== -40) {
                                    updateData.signal = isNaN(signal) ? null : signal;
                                }

                                await prisma.oNUConfigured.update({
                                    where: { id: onu.id },
                                    data: updateData
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
                            
                            // Notifikasi Lemah Sinyal (Weak Signal)
                            if (onu.signal !== null && onu.signal <= -27) {
                                // Prevent spamming by checking history
                                const recentSignalWarning = await prisma.activityLog.findFirst({
                                    where: { 
                                        action: 'Weak Signal', 
                                        details: { contains: onu.sn_mac },
                                        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // only once per hour
                                    }
                                });
                                
                                if (!recentSignalWarning) {
                                    await createNotification(
                                        onu.id,
                                        `ONU ${onu.name} (${onu.sn_mac}) has weak signal: ${onu.signal} dBm`,
                                        'warning'
                                    );
                                    await prisma.activityLog.create({
                                        data: {
                                            action: 'Weak Signal',
                                            details: `ONU ${onu.sn_mac} signal dropped to ${onu.signal} dBm`,
                                            status: 'Warning'
                                        }
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`[Sync] Batch processing failed:`, e);
                    }
                }
            } catch (e) {
                console.error(`[Sync] Gagal ambil status state dari OLT ${olt.name}`);
            }
        }
    } catch (error) {
        console.error("[Sync] Error:", error);
    } finally {
        isStatusSyncing = false;
    }
});

// 3. Hardware Metrics: Sync OLT CPU, Mem, Temp (Setiap 5 menit)
let isMetricsSyncing = false;
cron.schedule('*/5 * * * *', async () => {
    if (isMetricsSyncing) return;
    isMetricsSyncing = true;
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
    } finally {
        isMetricsSyncing = false;
    }
});
