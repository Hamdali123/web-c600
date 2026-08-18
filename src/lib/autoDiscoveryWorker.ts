import cron from 'node-cron';
import fs from 'fs';
import { executeOltCommand, OltCredentials, readOltAttenuation, getOltMetrics, getOnuDetails, authorizeOnu, executeOltCommandBatch, parseOltAttenuation, parseOnuDetails } from './oltConnection';
import prisma from './prisma';
import { createNotification } from './notifications';

// Universal GPON Vendor Prefix & Model Lookup Engine (ITU-T G.984)
function detectOnuType(sn: string, rawModel: string | null): string {
    const cleanSn = (sn || '').toUpperCase();
    const vendorPrefix = cleanSn.slice(0, 4);
    const cleanRaw = (rawModel || '').trim();

    // 1. If OLT returned a valid non-numeric model name (and is NOT part of the SN itself)
    if (cleanRaw && !/^\d+$/.test(cleanRaw) && cleanRaw.length >= 3 && cleanRaw.toUpperCase() !== 'UNKNOWN' && cleanRaw !== 'N/A' && !cleanSn.includes(cleanRaw)) {
        return cleanRaw;
    }

    // 2. Universal Vendor Prefix Dictionary (ITU-T G.984 Registered Vendor IDs)
    const vendorMap: Record<string, string> = {
        'ZTEG': 'ZTE-F660',
        'ELWG': 'ZTE-F660',
        'HWTC': 'HG8310M',
        'HNSN': 'HG8245H',
        'ALCL': 'Nokia-G-240W-A',
        'NOK':  'Nokia-G-140W-MD',
        'FHTC': 'FiberHome-AN5506',
        'FHTT': 'FiberHome-AN5506',
        'CIOT': 'FiberHome-AN5506',
        'VSOL': 'VSOL-V2801SG',
        'RLTK': 'ZTE-F660',
        'REAL': 'ZTE-F660',
        'XPON': 'ZTE-F660',
        'GPON': 'ZTE-F660',
        'EPON': 'ZTE-F660',
        'DSNW': 'Dasan-H640GW',
        'DLNK': 'D-Link-DPN-100',
        'TPLK': 'TP-Link-TX-6610',
        'TEND': 'Tenda-HG6',
        'CBLT': 'Cyberteam-GPON',
        'CDOT': 'CDOT-GPON',
    };

    return vendorMap[vendorPrefix] || 'ZTE-F660';
}

// 1. Radar: Mengecek OLT untuk ONU baru
let isUnconfiguredSyncing = false;

export async function scanUnconfiguredOnus(targetOltId?: number) {
    if (isUnconfiguredSyncing) return;
    isUnconfiguredSyncing = true;
    try {
        const whereFilter = targetOltId ? { id: targetOltId } : {};
        const olts = await prisma.oLTDevice.findMany({ where: whereFilter });

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
                    let output = await executeOltCommand(creds, 'show pon onu uncfg').catch(() => '');
                    if (output.includes('%Error') || output.includes('Invalid input')) {
                        output = await executeOltCommand(creds, 'show gpon onu uncfg').catch(() => '');
                    }
                    
                    const activeScannedSns = new Set<string>();
                    const lines = output.split('\n');
                    for (const line of lines) {
                        // Robust matching for ZTE C600 unconfigured output
                        const portMatch = line.match(/(?:gpon-olt_|gpon_olt-|gpon-onu_|gpon_onu-)?(\d+\/\d+\/\d+)(?::(\d+))?/i);
                        const snMatch = line.match(/\b([A-Z]{4}[A-Z0-9]{8})\b/i) || line.match(/\b([A-Z0-9]{12})\b/i);

                        if (portMatch && snMatch) {
                            const port = 'gpon_olt-' + portMatch[1];
                            const onuId = portMatch[2] || null;
                            const sn = snMatch[1].toUpperCase();
                            activeScannedSns.add(sn);

                            // ZTE C600 format: "gpon_olt-1/2/13   F660V1.0   ZTEGC9CC491B   GC9CC491B"
                            // Model is BEFORE the SN, not after it!
                            const lineUpper = line.toUpperCase();
                            const snIndex = lineUpper.indexOf(sn);
                            
                            // Get text between end of port match and start of SN
                            const portEnd = (portMatch.index || 0) + portMatch[0].length;
                            const beforeSn = snIndex > portEnd ? line.slice(portEnd, snIndex).trim() : '';
                            // Take last word before SN as model (skip port digits/separators)
                            const beforeWords = beforeSn.split(/\s+/).filter(w => /[A-Za-z]/.test(w) && w.length >= 3);
                            const rawModel = beforeWords.length > 0 ? beforeWords[beforeWords.length - 1] : null;

                            const detectedModel = detectOnuType(sn, rawModel);

                            const existsUncfg = await prisma.oNUUnconfigured.findUnique({ where: { sn_mac: sn } });
                            const existsConfigured = await prisma.oNUConfigured.findUnique({ where: { sn_mac: sn } });

                            if (!existsConfigured && !existsUncfg) {
                                await prisma.oNUUnconfigured.create({
                                    data: {
                                        sn_mac: sn,
                                        olt_id: olt.id,
                                        pon_port: port,
                                        onu_id: onuId,
                                        model: detectedModel
                                    }
                                });
                                console.log(`[Radar] Ditemukan ONU Baru! SN: ${sn} | Model: ${detectedModel} | Port: ${port}`);
                            } else if (existsUncfg) {
                                // Always refresh model, port, and onu_id on every scan
                                await prisma.oNUUnconfigured.update({
                                    where: { sn_mac: sn },
                                    data: {
                                        model: detectedModel,
                                        olt_id: olt.id,
                                        pon_port: port,
                                        onu_id: onuId,
                                    }
                                });
                                if (existsUncfg.model !== detectedModel) {
                                    console.log(`[Radar] Update model ONU SN: ${sn} → ${detectedModel}`);
                                }
                            }
                        }
                    }

                    // Purge unconfigured ONUs that were unplugged / no longer present on physical OLT
                    await prisma.oNUUnconfigured.deleteMany({
                        where: {
                            olt_id: olt.id,
                            sn_mac: { notIn: Array.from(activeScannedSns) }
                        }
                    });
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
}

cron.schedule('* * * * *', async () => {
    await scanUnconfiguredOnus();
});

// 2. Status Sync: Update status (Online/Offline) dan Sinyal ONU (Setiap 2 menit)
let isStatusSyncing = false;
// Staggered detail refresh: per cycle only 1/DETAIL_ROTATION of online ONUs get
// signal/distance/uptime refreshed (rotating), so each ONU is fully refreshed
// every DETAIL_ROTATION cycles (~20 min at 2-min cycles). This matches the real
// SmartOLT recommendation (signal every 15-30 min, staggered) and keeps telnet
// load low so config actions never wait behind big detail batches.
const DETAIL_ROTATION = 10;
let detailRotationOffset = 0;
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
                    let portNumber = (onu.pon_port || '')
                        .replace('gpon-olt_', '')
                        .replace('gpon_olt-', '')
                        .replace('gpon-onu_', '')
                        .replace('gpon_onu-', '');
                    
                    const targetIndex = `${portNumber}:${onu.onu_id}`;
                    
                    let state = null;
                    let adminState = null;
                    for (const line of stateLines) {
                        const trimmed = line.trim();
                        // Match if line starts with the ONU index (e.g. 1/2/1:2)
                        if (trimmed.startsWith(targetIndex + ' ') || trimmed.startsWith(targetIndex + '\t')) {
                            const parts = trimmed.split(/\s+/);
                            // ZTE C600 format: OnuIndex  Admin state  OMCC state  Phase state  Speed mode
                            // e.g. 1/2/1:2  enable  enable  working  GPON
                            // or   1/2/1:1  disable disable OffLine  N/A
                            if (parts.length >= 4) {
                                adminState = parts[1]?.toLowerCase(); // enable or disable
                                state = parts[3]?.toLowerCase();      // working or offline
                            }
                            break;
                        }
                    }

                    // If not found in output (likely due to telnet truncation), skip updating this ONU to avoid false offlines
                    if (!state && !adminState) continue;

                    // 2 statuses: Online (working) or Offline (admin-disabled OR physically offline)
                    let status: string;
                    let reason: string | null = null;
                    if (adminState === 'disable') {
                        status = 'Offline';
                        reason = 'admin_disabled';
                    } else if (state === 'working') {
                        status = 'Online';
                        reason = null;
                    } else {
                        status = 'Offline';
                        reason = state; // e.g. 'offline', 'dying-gasp', 'los'
                    }

                    // Update Status Utama
                    await prisma.oNUConfigured.update({
                        where: { id: onu.id },
                        data: {
                            status: status,
                            offline_reason: reason,
                            // Clear signal when ONU goes offline so UI doesn't show stale values
                            ...(status === 'Offline' ? { signal: null, signal_tx: null } : {})
                        }
                    });

                    // Jika Online, tambahkan ke list untuk dibatch
                    if (status === 'Online') {
                        onlineOnus.push({ onu, portNumber });
                    } else {
                        // Notifikasi Offline
                        const offlineReasonLower = reason?.toLowerCase() || '';
                        if (offlineReasonLower.includes('power') || offlineReasonLower.includes('los') || offlineReasonLower.includes('dying-gasp') || offlineReasonLower.includes('dyinggasp')) {
                            await createNotification(
                                onu.id,
                                `ONU ${onu.name} is ${status} (${reason})`,
                                offlineReasonLower.includes('los') ? 'error' : 'warning'
                            );
                        }
                    }
                } // End of state processing loop

                if (onlineOnus.length > 0 && creds.vendor === 'zte') {
                    // Rotate: refresh only 1/DETAIL_ROTATION of online ONUs per
                    // cycle, keeping the others' last-known values.
                    const rotated = onlineOnus
                        .filter((_, ix) => (ix + detailRotationOffset) % DETAIL_ROTATION === 0);
                    console.log(`[Sync] OLT ${olt.name}: ${onlineOnus.length} online, refreshing detail for ${rotated.length} (rotation ${detailRotationOffset}/${DETAIL_ROTATION})`);
                    // Chunk the detail queries (~15 ONUs = 30 commands per telnet
                    // session) so a transient session failure only drops one chunk
                    // instead of the whole sync, and the OLT mutex is released
                    // quickly so user actions (reboot/authorize/config updates)
                    // never wait behind a long batch session.
                    const CHUNK_ONUS = 15;
                    for (let chunkStart = 0; chunkStart < rotated.length; chunkStart += CHUNK_ONUS) {
                        const chunk = rotated.slice(chunkStart, chunkStart + CHUNK_ONUS);
                        const commands: string[] = [];
                        for (const { onu, portNumber } of chunk) {
                            const onuInterface = `gpon_onu-${portNumber}:${onu.onu_id}`;
                            commands.push(`show pon power attenuation ${onuInterface}`);
                            commands.push(`show gpon onu detail-info ${onuInterface}`);
                        }

                        let outputs: string[];
                        try {
                            outputs = await executeOltCommandBatch(creds, commands);
                        } catch (e) {
                            console.warn(`[Sync] Detail chunk failed (${chunk.length} ONUs), skipped: ${(e as Error).message}`);
                            continue;
                        }
                        let outputIndex = 0;
                        for (const { onu, portNumber } of chunk) {
                            try {
                                const attOutput = outputs[outputIndex++];
                                const detOutput = outputs[outputIndex++];

                                const att = parseOltAttenuation(attOutput);
                                const details = parseOnuDetails(detOutput);

                                const signal = att.onu_rx_power === 'null' ? null : parseFloat(att.onu_rx_power);
                                const signal_tx = att.onu_tx_power === 'null' ? null : parseFloat(att.onu_tx_power);

                                const updateData: any = {
                                    signal_tx: (signal_tx === null || isNaN(signal_tx as number)) ? null : signal_tx,
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

                                // Only update signal if OLT returned a valid reading (not null/no signal)
                                if (signal !== null && !isNaN(signal as number)) {
                                    updateData.signal = signal;
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

                                if (!recentHistory && signal !== null && !isNaN(signal)) {
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
                    }
                }
            } catch (e) {
                console.error(`[Sync] Gagal ambil status state dari OLT ${olt.name}`);
            }
        }
        // Advance the rotation so the next cycle refreshes a different slice
        detailRotationOffset = (detailRotationOffset + 1) % DETAIL_ROTATION;
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

// 3. Auto-Tasks Processor (Resync, Move)
let isAutoTaskProcessing = false;
cron.schedule('*/5 * * * *', async () => {
    if (isAutoTaskProcessing) return;
    isAutoTaskProcessing = true;
    try {
        const runningTasks = await prisma.autoTask.findMany({
            where: { status: 'Running', action: { in: ['Auto-Resync', 'Auto-Move'] } }
        });

        for (const task of runningTasks) {
            // For now, simulate the task processing or do basic operations
            // A full Auto-Resync would iterate over all ONUs for the OLT and re-push their configs.
            
            // To prevent blocking, just simulate progress for this demo, or process 1 batch
            if (task.action === 'Auto-Resync') {
                const count = await prisma.oNUConfigured.count({ where: { olt_id: task.olt_id } });
                if (task.processed >= count) {
                    await prisma.autoTask.update({ where: { id: task.id }, data: { status: 'Finished', end_time: new Date() } });
                } else {
                    // Simulate processing 5 ONUs
                    await prisma.autoTask.update({ where: { id: task.id }, data: { processed: { increment: 5 }, successful: { increment: 5 } } });
                }
            } else if (task.action === 'Auto-Move') {
                await prisma.autoTask.update({ where: { id: task.id }, data: { status: 'Finished', end_time: new Date() } });
            }
        }
    } catch (e) {
        console.error("AutoTask processor error:", e);
    } finally {
        isAutoTaskProcessing = false;
    }
});
