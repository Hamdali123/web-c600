// Profiles/type values confirmed to exist on the ZTE C600 (verified from running-config)
const KNOWN_TCONT_PROFILES = [
    'SMARTOLT-1G-UP',
    'SMARTOLT-5M-UP',
    'SMARTOLT-1G-DOWN',
    'SMARTOLT-5M-DOWN',
    'SMARTOLT-IPTV-50M-DOWN',
    'SMARTOLT-VOIPMNG-10M',
    'SMARTOLT_DEFAULT_TCONT_GPON',
    'SMARTOLT_DEFAULT_TCONT_1G',
];

const KNOWN_ONU_TYPES = [
    'ALL',
    'ALLBRIGDE',
    'ZTE-F660',
    'ZTE-F660V5.0',
    'ZTE-F660V5.2',
    'HG8245H',
];

// The ENTIRE SmartOLT-managed network on this OLT registers every ONU as
// 'type ALL' (verified live on the user's SmartOLT instance + running-config:
// all ~230 ONUs are 'type ALL') and 'vlan port eth_1/x' works there, while
// 'vlan port eth_0/x' has NEVER been applied successfully on this OLT
// (0 occurrences in running-config; live test on ONU 413 fails with
// "%Error 223982: Please check if the port is in the VLAN." while wifi_0/x
// works). So keep ALL as ALL instead of mapping it away.
const NOGO_ONU_TYPES: string[] = [];

// Map DB speed-profile name to a tcont profile that exists on the OLT
// (DB names like "1G"/"5M"/"default" are rejected by the C600 CLI)
export function mapTcontProfile(profileName?: string): string {
    const name = (profileName || '').trim();
    if (!name || name.toLowerCase() === 'default') {
        return 'SMARTOLT_DEFAULT_TCONT_GPON';
    }
    if (name.includes('SMARTOLT')) {
        return name;
    }
    const lower = name.toLowerCase();
    if (lower.includes('1g') || lower.includes('1000m')) {
        return 'SMARTOLT-1G-UP';
    }
    if (lower.includes('5m') || lower.includes('512')) {
        return 'SMARTOLT-5M-UP';
    }
    return 'SMARTOLT_DEFAULT_TCONT_GPON';
}

// Map DB ONU type to a type the C600 accepts.
export function mapOnuType(onuType?: string, sn?: string): string {
    const type = (onuType || '').trim();
    if (type && KNOWN_ONU_TYPES.includes(type)) {
        return type;
    }
    if (type && NOGO_ONU_TYPES.includes(type)) {
        return sn && /^(HWTC|HNSN)/i.test(sn) ? 'HG8245H' : 'ZTE-F660';
    }
    const lower = type.toLowerCase();
    if (lower.includes('hg8245') || lower.includes('huawei')) {
        return 'HG8245H';
    }
    if (sn && /^(HWTC|HNSN)/i.test(sn)) {
        return 'HG8245H';
    }
    if (lower.includes('f670') || lower.includes('f609') || lower.includes('generic') || lower.includes('1ge')) {
        return 'ZTE-F660';
    }
    // Default: 'ALL' matches how SmartOLT registers every ONU on this network.
    return 'ALL';
}

export function authorizeOnuCommand(params: {
    portInfo: string;
    onuId: string;
    sn: string;
    name: string;
    vlan: string | number;
    mode: 'bridge' | 'route';
    pppoeUser?: string;
    pppoePass?: string;
    onuType?: string;
    profileName?: string;
    recreate?: boolean;
}) {
    // Normalize portInfo to standard gpon_olt-1/1/13 and gpon_onu-1/1/13
    let oltInterface = params.portInfo;
    if (oltInterface.includes('gpon-olt_')) {
        oltInterface = oltInterface.replace('gpon-olt_', 'gpon_olt-');
    }
    
    const interfacePort = oltInterface.replace('gpon_olt-', 'gpon_onu-');
    
    // Parse VLANs to support multiple (e.g. "125, 200")
    const vlanStr = (params.vlan || '').toString();
    const vlans = vlanStr.split(',').map(v => v.trim()).filter(Boolean);
    const mainVlan = vlans[0] || '125'; // fallback vlan
    
    // C600 uses gemport mode (vport-mode manual is rejected with
    // "%Error 222387: Can't modify vport mode."). Services map directly to gemport 1.
    let mngServiceConfig = '';
    for (let i = 0; i < vlans.length; i++) {
        mngServiceConfig += `  service ${i + 1} gemport 1 vlan ${vlans[i]}\n`;
    }
    mngServiceConfig += '  veip 1\n';

    let portModeConfig = '';
    const mappedType = mapOnuType(params.onuType, params.sn);
    const uni = uniPrefix(mappedType); // 'eth_1' or 'eth_0'
    const ethUni = `${uni}1`;
    if (params.mode === 'bridge') {
        // Bridge ALL physical UNIs (eth + wifi) so the subscriber device works
        // no matter which port it is plugged into. Verified live on the C600:
        // 'vlan port eth_1/2 ...' and 'vlan port wifi_1/x ...' are accepted.
        const vlanPorts = (p: number, prefix: string) => {
            const isWifi = prefix.startsWith('wifi');
            if (isWifi) {
                // WiFi UNIs reject the follow-up 'vlan port ... vlan <list>' line
                // ("%Error 223983: Port mode error" on the C600), so keep them
                // single-VLAN tagged with the main VLAN.
                return `  vlan port ${prefix}${p} mode tag vlan ${mainVlan}`;
            }
            // 'mode hybrid def-vlan X' + 'vlan <list>' is accepted regardless of
            // the port's current mode, while plain 'mode tag' is rejected with
            // "%Error 223982: Please check if the port is in the VLAN." once the
            // port has been hybrid/trunk before. Bridge all eth UNIs as hybrid.
            return `  vlan port ${prefix}${p} mode hybrid def-vlan ${mainVlan}\n  vlan port ${prefix}${p} vlan ${vlans.join(',')}`;
        };
        const wifiUni = uni.replace('eth', 'wifi');
        portModeConfig = vlanPorts(1, uni);
        for (let p = 2; p <= 4; p++) portModeConfig += `\n${vlanPorts(p, uni)}`;
        for (let p = 1; p <= 4; p++) portModeConfig += `\n${vlanPorts(p, wifiUni)}`;
    } else {
         // Order matches the known-good hand-configured ONUs on this C600:
         // wan-ip pppoe → ping-response → 'wan 1 service internet host 1'.
         if (params.pppoeUser || params.pppoePass) {
             portModeConfig += `  wan-ip ipv4 mode pppoe username ${params.pppoeUser || ''} password ${params.pppoePass || ''} vlan-profile SMARTOLT_VLAN_${mainVlan} host 1\n`;
         } else {
             portModeConfig += `  wan-ip ipv4 mode dhcp vlan-profile SMARTOLT_VLAN_${mainVlan} host 1\n`;
         }
         portModeConfig += `  wan-ip ipv4 ping-response enable traceroute-response enable\n`;
         portModeConfig += `  wan 1 service internet host 1\n`;
         if (vlans.length > 1) {
             // Map extra VLANs (e.g. Hotspot) to bridge on eth_1/1
             const extraVlans = vlans.slice(1).join(',');
             portModeConfig += `  vlan port eth_0/1 mode hybrid def-vlan ${vlans[1]}\n  vlan port eth_0/1 vlan ${extraVlans}`;
         }
    }

    // Auto-create missing vlan-profiles (SMARTOLT_VLAN_<id>) before using them in
    // 'wan-ip ... vlan-profile'. Without this, any VLAN without a pre-made profile
    // (e.g. 323) makes the OLT reject the wan-ip line with "%Error 223981: Profile
    // does not exist." — and the ONU ends up registered but with no internet.
    // Re-running on an existing profile is a no-op on the C600 (verified live).
    let vlanProfileSetup = '';
    if (params.mode !== 'bridge') {
        for (const v of vlans) {
            vlanProfileSetup += `  onu profile vlan SMARTOLT_VLAN_${v} tag-mode tag cvlan ${v}\n`;
        }
    }

    const tcontProfile = mapTcontProfile(params.profileName);
    const onuType = mapOnuType(params.onuType, params.sn);
    const gponBlock = vlanProfileSetup ? `gpon\n${vlanProfileSetup.trimEnd()}\nexit\n` : '';
    // Re-registering an existing ONU id fails with "%Error 222391: The entry is
    // existed. This is a re-create operation." — delete it first when asked to
    // recreate (used by resync when the registered type is wrong, e.g. type ALL).
    const onuLine = params.recreate
        ? `  no onu ${params.onuId}\n  onu ${params.onuId} type ${onuType} sn ${params.sn}`
        : `  onu ${params.onuId} type ${onuType} sn ${params.sn}`;

    return `
configure terminal
${gponBlock}interface ${oltInterface}
${onuLine}
exit
interface ${interfacePort}:${params.onuId}
  name ${params.name}
  tcont 1 profile ${tcontProfile}
  gemport 1 name internet tcont 1
exit
pon-onu-mng ${interfacePort}:${params.onuId}
${mngServiceConfig.trimEnd()}
${portModeConfig}
exit
${servicePortConfig(vportInterface(params.portInfo, params.onuId), vlans)}
`;
}

// Canonical interface-name helpers. The DB stores pon_port as 'gpon-olt_1/2/13'
// (or 'gpon_olt-1/2/13'); the C600 CLI only accepts 'gpon_onu-1/2/13' (ONU) and
// 'gpon_olt-1/2/13' (OLT). Normalize here so every command works on the hardware.
function toOnuInterface(portInfo: string): string {
    let p = (portInfo || '').trim();
    if (p.includes('gpon-onu_')) p = p.replace('gpon-onu_', 'gpon_onu-');
    else if (p.includes('gpon_onu-')) { /* already canonical */ }
    else if (p.includes('gpon-olt_')) p = p.replace('gpon-olt_', 'gpon_onu-');
    else if (p.includes('gpon_olt-')) p = p.replace('gpon_olt-', 'gpon_onu-');
    else if (/^\d/.test(p)) p = `gpon_onu-${p}`;
    return p;
}

function toOltInterface(portInfo: string): string {
    let p = (portInfo || '').trim();
    if (p.includes('gpon-onu_')) p = p.replace('gpon-onu_', 'gpon_olt-');
    else if (p.includes('gpon-olt_')) p = p.replace('gpon-olt_', 'gpon_olt-');
    else if (p.includes('gpon_onu-')) p = p.replace('gpon_onu-', 'gpon_olt-');
    else if (/^\d/.test(p)) p = `gpon_olt-${p}`;
    return p;
}

export function rebootOnuCommand(portInfo: string, onuId: string) {
    const interfacePort = toOnuInterface(portInfo);
    // ZTE C600: single-ONU reboot is issued inside pon-onu-mng and REQUIRES an
    // explicit confirmation ('yes') to the "Confirm to reboot? [yes/no]:" prompt —
    // verified live on the physical C600 (ONU goes LOS -> syncMib -> working).
    // ('reset' inside the gpon_onu interface also exists but silently no-ops.)
    return `configure terminal
pon-onu-mng ${interfacePort}:${onuId}
reboot
yes
exit
exit`;
}

export function deleteOnuCommand(portInfo: string, onuId: string) {
    const interfacePort = toOltInterface(portInfo);
    return `
configure terminal
interface ${interfacePort}
  no onu ${onuId}
exit
`;
}

export function enableOnuCommand(portInfo: string, onuId: string) {
    const interfacePort = toOnuInterface(portInfo);
    // C600: ONU admin state lives on the gpon_onu interface ('admin enable').
    // 'onu <id> admin enable' inside gpon_olt is NOT valid on this firmware
    // (verified: %Error 140303 Invalid input).
    return `
configure terminal
interface ${interfacePort}:${onuId}
  admin enable
exit
`;
}

export function disableOnuCommand(portInfo: string, onuId: string) {
    const interfacePort = toOnuInterface(portInfo);
    return `
configure terminal
interface ${interfacePort}:${onuId}
  admin disable
exit
`;
}

export function getRunningConfigCommand(portInfo: string, onuId: string) {
    const interfacePort = toOnuInterface(portInfo);
    return `show gpon onu detail-info ${interfacePort}:${onuId}`;
}

export function getMetricsCommand() {
    return `show processor\nshow card`;
}

export function getCardsCommand() {
    return `show card`;
}

export function getSaveCommand() {
    return `write`;
}

export function getPonPortsCommand() {
    return `show gpon onu state\nshow card\nshow interface brief`;
}

// Removed duplicate getUplinkPortsCommand

export function getVlansCommand() {
    // C600 uses 'show vlan summary' which returns:
    // All created vlan num: 7
    // Details are following:
    //   1,25,99,125,323,1000,3000
    return `show vlan summary`; 
}

export function updatePonPortCommand(portName: string, adminState: string, description: string, minRange: number, maxRange: number) {
    const interfacePort = portName.replace('gpon-olt_', 'gpon_olt-');
    let cmds = `configure terminal\ninterface ${interfacePort}\n`;
    if (adminState === 'Disabled') {
        cmds += `  shutdown\n`;
    } else {
        cmds += `  no shutdown\n`;
    }
    if (description) {
        cmds += `  description ${description}\n`;
    }
    // Note: C600 might use 'onu distance ...' or similar for range, but for now we apply standard ones if available
    // cmds += `  onu distance max ${maxRange} min ${minRange}\n`;
    cmds += `exit`;
    return cmds;
}

export function updateUplinkPortCommand(portName: string, adminState: string, description: string) {
    let cmds = `configure terminal\ninterface ${portName}\n`;
    if (adminState === 'Disabled') {
        cmds += `  shutdown\n`;
    } else {
        cmds += `  no shutdown\n`;
    }
    if (description) {
        cmds += `  description ${description}\n`;
    }
    cmds += `exit`;
    return cmds;
}

export function updateSpeedProfileCommand(portInfo: string, onuId: string, uploadProfile: string, downloadProfile: string) {
    const interfacePort = toOnuInterface(portInfo);
    
    // C600 only supports tcont profile switching; 'gemport traffic-limit' is not valid
    const tcontProfile = mapTcontProfile(uploadProfile);

    return `configure terminal
interface ${interfacePort}:${onuId}
  tcont 1 profile ${tcontProfile}
exit
`;
}

export function parseVlans(output: string) {
    const vlans: { id: number, desc: string, name: string }[] = [];
    
    // C600 'show vlan summary' format:
    // All created vlan num: 7
    // Details are following:
    //   1,25,99,125,323,1000,3000
    const detailsMatch = output.match(/Details are following:\s*([\d,\s]+)/i);
    if (detailsMatch) {
        const idList = detailsMatch[1].replace(/\s/g, '');
        idList.split(',').forEach(idStr => {
            const id = parseInt(idStr.trim());
            if (!isNaN(id)) {
                vlans.push({ id, desc: `VLAN${String(id).padStart(4, '0')}`, name: `VLAN${String(id).padStart(4, '0')}` });
            }
        });
        return vlans;
    }

    // Fallback: try line-by-line parsing (old 'show vlan' format)
    const lines = output.split('\n');
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const vlanIdStr = parts[0];
            if (/^\d+$/.test(vlanIdStr)) {
                vlans.push({
                    id: parseInt(vlanIdStr),
                    desc: parts[1],
                    name: parts[1]
                });
            }
        }
    }
    return vlans;
}

// Parse 'show vlan <id>' detail output to get the name
export function parseVlanDetail(output: string): { name: string, id: number } | null {
    const idMatch = output.match(/vlanid\s*:(\d+)/i);
    const nameMatch = output.match(/name\s*:([^\n]+)/i);
    if (idMatch) {
        return {
            id: parseInt(idMatch[1]),
            name: (nameMatch?.[1] || '').trim()
        };
    }
    return null;
}

export function parseCards(output: string) {
    const lines = output.split('\n');
    const cards: any[] = [];
    let startParsing = false;

    for (const line of lines) {
        if (line.includes('---')) {
            startParsing = true;
            continue;
        }
        if (!startParsing) continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
            cards.push({
                shelf: parts[0],
                slot: parts[1],
                type: parts[2],
                status: parts[3],
                role: parts[4] || '',
                hardVer: parts[5] || '',
                softVer: parts[6] || '',
                cpu: parts[7] || 'N/A',
                mem: parts[8] || 'N/A',
                temp: parts[9] || 'N/A'
            });
        }
    }
    return cards;
}

export function parsePonPorts(stateOutput: string, cardsOutput: string = '', briefOutput: string = '') {
    const onuCounts: Record<string, { total: number, online: number }> = {};
    const stateLines = stateOutput.split('\n');
    let stateParsing = false;
    for (const line of stateLines) {
        if (line.includes('---')) { stateParsing = true; continue; }
        if (!stateParsing) continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
            const fullPort = parts[0]; 
            let portName = fullPort.split(':')[0].replace('onu', 'olt');
            
            if (/^\d+\/\d+\/\d+$/.test(portName)) {
                portName = `gpon_olt-${portName}`;
            }

            if (!onuCounts[portName]) onuCounts[portName] = { total: 0, online: 0 };
            onuCounts[portName].total++;
            
            if (line.toLowerCase().includes('working')) {
                onuCounts[portName].online++;
            }
        }
    }

    const portsMap = new Map<string, any>();
    
    // Parse brief output to get admin and oper states
    const briefStates: Record<string, { adminState: string, operState: string }> = {};
    if (briefOutput) {
        const briefLines = briefOutput.split('\n');
        for (const line of briefLines) {
             if (line.includes('gpon_olt-') || line.includes('gpon-olt_')) {
                 const parts = line.trim().split(/\s+/);
                 if (parts.length >= 3) {
                     let name = parts[0];
                     name = name.replace('gpon-olt_', 'gpon_olt-');
                     briefStates[name] = {
                         adminState: parts[parts.length - 2],
                         operState: parts[parts.length - 1]
                     };
                 }
             }
        }
    }

    if (cardsOutput) {
        const cards = parseCards(cardsOutput);
        for (const card of cards) {
            if (card.type.startsWith('GF') || card.type.startsWith('GT') || card.status === 'GFGN' || card.status === 'GFGL') {
                const numPorts = parseInt(card.role) || (card.type.includes('G') ? 16 : 8);
                const prefix = `gpon_olt-${card.shelf}/${card.slot}/`;
                for (let i = 1; i <= numPorts; i++) {
                    const pName = `${prefix}${i}`;
                    const states = briefStates[pName] || { adminState: 'enable', operState: 'down' };
                    const onuTotal = onuCounts[pName]?.total || 0;
                    const onuOnline = onuCounts[pName]?.online || 0;
                    
                    let aState = states.adminState.toLowerCase();
                    let oState = states.operState.toLowerCase();
                    
                    if (aState === 'enable' || aState === 'enabled') aState = 'up';
                    if (aState === 'disable' || aState === 'disabled') aState = 'down';
                    
                    // If operState is unknown, infer from ONU count (as requested by user)
                    if (!briefStates[pName]) {
                        oState = onuTotal > 0 ? 'up' : 'down';
                    }
                    
                    portsMap.set(pName, {
                        name: pName,
                        adminState: aState,
                        operState: oState,
                        onuCount: onuTotal,
                        onlineCount: onuOnline,
                        offlineCount: onuTotal - onuOnline
                    });
                }
            }
        }
    }
    
    // Add any ports that were in the state list but not caught by card logic
    for (const [portName, counts] of Object.entries(onuCounts)) {
        if (!portsMap.has(portName)) {
            portsMap.set(portName, {
                name: portName,
                adminState: 'up',
                operState: 'up',
                onuCount: counts.total,
                onlineCount: counts.online,
                offlineCount: counts.total - counts.online
            });
        }
    }

    return Array.from(portsMap.values());
}

export function getUplinkPortsCommand() {
    return `show interface brief\nshow interface optical-module`;
}

export function parseUplinkPorts(output: string) {
    const lines = output.split('\n');
    const portsMap = new Map<string, any>();

    let currentSection = ''; // 'brief' or 'optical'
    
    for (const line of lines) {
        if (line.includes('Interface') && line.includes('Status')) currentSection = 'brief';
        if (line.includes('Optical Module Information')) currentSection = 'optical';

        if (line.includes('gei-')) {
            const parts = line.trim().split(/\s+/);
            const name = parts[0];
            
            if (!portsMap.has(name)) {
                portsMap.set(name, {
                    name, adminState: '', operState: '', description: '',
                    rxPower: '', txPower: '', temp: ''
                });
            }

            const port = portsMap.get(name);
            
            if (parts.length >= 6 && !line.includes('Rx') && !line.includes('Tx')) { // brief section
                port.adminState = parts[4];
                port.operState = parts[5];
                port.description = parts.slice(7).join(' ') || '';
            }
        }
        
        // Match optical module info (this varies heavily by firmware, simplified extraction)
        // e.g. xgei-1/10/1    Rx : -11.904 (dBm)  Tx : 1.697 (dBm)
        // or just looking for lines that contain port name and Rx/Tx
        const opticalMatch = line.match(/(x?gei-\d+\/\d+\/\d+).*?Rx\s*:\s*([\-\d\.]+).*?Tx\s*:\s*([\-\d\.]+)/i);
        if (opticalMatch) {
            const name = opticalMatch[1];
            if (portsMap.has(name)) {
                const port = portsMap.get(name);
                port.rxPower = opticalMatch[2];
                port.txPower = opticalMatch[3];
            }
        }
        const tempMatch = line.match(/(x?gei-\d+\/\d+\/\d+).*?Temperature\s*:\s*([\-\d\.]+)/i);
        if (tempMatch) {
            const name = tempMatch[1];
            if (portsMap.has(name)) {
                portsMap.get(name).temp = tempMatch[2];
            }
        }
    }
    
    return Array.from(portsMap.values());
}

// ZTE C600 CLI port naming depends on the ONU type's onu-type-if mapping:
//  - type ALL        -> eth_1/1..eth_1/4, wifi_1/1..wifi_1/4
//  - ZTE-F660/HG8245H/... -> eth_0/1..eth_0/4, wifi_0/1..wifi_0/4
// SmartOLT UI displays ports as eth_1/1..eth_1/4 / wifi_1/1. For non-ALL types the
// CLI addresses the same ports as eth_0/x, so convert; for type ALL keep as-is.
function toZtePort(portName: string, onuType?: string): string {
    if (!portName) return portName;
    const rawType = (onuType || '').trim();
    if (rawType && !/^ALL$/i.test(rawType) && !/^ALLBRIGDE$/i.test(rawType)) {
        if (/^(eth|wifi|uni|tve|pon)_1\//i.test(portName)) {
            return portName.replace(/^(eth|wifi|uni|tve|pon)_1\//i, '$1_0/');
        }
    }
    return portName;
}

// UNI prefix for 'vlan port' lines based on the registered ONU type on the OLT.
function uniPrefix(onuType?: string): string {
    const rawType = (onuType || '').trim();
    return /^ALL$/i.test(rawType) ? 'eth_1/' : 'eth_0/';
}

export function updateEthPortCommand(onuInterface: string, portName: string, mode: string, vlans: string, adminState?: string, dhcp?: string, onuType?: string) {
    const commands = [];
    commands.push('configure terminal');
    commands.push(`pon-onu-mng ${onuInterface}`);
    
    const ztePort = toZtePort(portName, onuType);

    // Handle Admin State (ZTE: interface eth -> state lock|unlock, one-line form;
    // 'interface eth <port>' alone is incomplete on some firmware builds)
    if (adminState === 'Shutdown') {
        commands.push(`interface eth ${ztePort} state lock`);
    } else if (adminState === 'Enabled') {
        commands.push(`interface eth ${ztePort} state unlock`);
    }

    // Handle Mode
    if (mode === 'LAN' || mode === 'Transparent' || mode === 'Transparent_old') {
        commands.push(`vlan port ${ztePort} mode transparent`);
    } else if (mode === 'Access') {
        // Plain 'mode tag' only works while the port is still default/tag;
        // once the port has been hybrid/trunk the OLT rejects it with
        // %Error 223982 ("Please check if the port is in the VLAN").
        commands.push(`vlan port ${ztePort} mode tag vlan ${vlans.trim()}`);
    } else if (mode === 'Trunk') {
        commands.push(`vlan port ${ztePort} mode trunk`);
        if (vlans.trim()) commands.push(`vlan port ${ztePort} vlan ${vlans.trim()}`);
    } else if (mode === 'Hybrid') {
        const vlanStr = vlans.trim();
        const defMatch = vlanStr.match(/def-vlan\s+(\d+)/i);
        const vlanMatch = vlanStr.match(/vlan\s+([\d,-]+)/i);
        
        if (defMatch && vlanMatch) {
            commands.push(`vlan port ${ztePort} mode hybrid def-vlan ${defMatch[1]}`);
            commands.push(`vlan port ${ztePort} vlan ${vlanMatch[1]}`);
        } else if (defMatch) {
            commands.push(`vlan port ${ztePort} mode hybrid def-vlan ${defMatch[1]}`);
        } else {
            commands.push(`vlan port ${ztePort} mode hybrid`);
            if (vlanStr) commands.push(`vlan port ${ztePort} vlan ${vlanStr}`);
        }
    }

    // Handle DHCP
    if (dhcp === 'From ONU') {
        // Just an example, usually means transparent or specific config
    } else if (dhcp === 'Enable') {
        commands.push(`dhcp-ip ethuni ${ztePort} from-onu`);
    }

    commands.push('exit');
    commands.push('exit');
    return commands.join('\n');
}

export function updateWifiPortCommand(onuInterface: string, portName: string, mode: string, adminState?: string, ssid?: string, action: string = 'save', onuType?: string) {
    const commands = [];
    commands.push('configure terminal');
    commands.push(`pon-onu-mng ${onuInterface}`);
    
    const ztePort = toZtePort(portName, onuType);

    if (action === 'clear') {
        commands.push(`interface wifi ${ztePort} state lock`);
        commands.push(`vlan port ${ztePort} mode transparent`);
        if (ssid && ssid.trim() !== '') {
            commands.push(`no ssid ctrl ${ztePort} name ${ssid.trim()}`);
        }
    } else {
        // Handle Admin State (ZTE: interface wifi -> state lock|unlock, one-line
        // form — 'interface wifi <port>' alone is "Incomplete command" on C600)
        if (adminState === 'Shutdown') {
            commands.push(`interface wifi ${ztePort} state lock`);
        } else if (adminState === 'Enabled') {
            commands.push(`interface wifi ${ztePort} state unlock`);
        }

        // Handle Mode
        if (mode === 'LAN') {
            commands.push(`vlan port ${ztePort} mode transparent`);
        } else if (mode === 'Access') {
            commands.push(`vlan port ${ztePort} mode tag vlan`);
        } else if (mode === 'Trunk') {
            commands.push(`vlan port ${ztePort} mode trunk`);
        } else if (mode === 'Hybrid') {
            commands.push(`vlan port ${ztePort} mode hybrid`);
        }

        // Handle SSID (ZTE: ssid ctrl <port> name <name>)
        if (ssid && ssid.trim() !== '') {
            commands.push(`ssid ctrl ${ztePort} name ${ssid.trim()}`);
        }
    }

    commands.push('exit');
    commands.push('exit');
    return commands.join('\n');
}

// Wipes the existing service/wan entries first so re-applying is idempotent.
export function clearServiceCommand(portInfo: string, onuId: string) {
    const interfacePort = toOnuInterface(portInfo);
    let clearService = '';
    for (let i = 1; i <= 4; i++) {
        clearService += `  no service ${i}\n`;
    }
    return `
configure terminal
pon-onu-mng ${interfacePort}:${onuId}
${clearService.trimEnd()}
  no wan 1
  no wan-ip ipv4
exit
`;
}

// The C600 names services by VLAN when created via "service <vlan> ..."
// (e.g. "vlan125") and by index when created via "service 1 ...". Clearing only
// indices 1..4 leaves vlan-named services behind, so clear by the actual names
// returned by 'show gpon remote-onu service'.
export function clearServiceCommandByName(onuInterface: string, serviceNames: string[]) {
    const lines = serviceNames.map(n => `  no service ${n}`).join('\n');
    return `
configure terminal
pon-onu-mng ${onuInterface}
${lines}
  no wan 1
  no wan-ip ipv4
exit
`;
}

export function parseServiceNames(output: string): string[] {
    const names: string[] = [];
    for (const m of output.matchAll(/^(\S+)\s+\d+\s+--\s+--\s+\d+\s*$/gm)) {
        names.push(m[1]);
    }
    return names;
}

// OLT-side vport interface for an ONU, e.g. "gpon-olt_1/2/1" + "1" -> "vport-1/2/1.1:1"
export function vportInterface(portInfo: string, onuId: string): string {
    const interfacePort = toOnuInterface(portInfo);
    const slot = interfacePort.replace('gpon_onu-', '');
    return `vport-${slot}.${onuId}:1`;
}

// SmartOLT mirrors the C600's L2 forwarding through OLT-side service-ports on the
// vport interface (main vlan -> service-port 1, extras -> 11, 12, ...) plus the
// egress traffic-policy. The OLT accepts these on existing ONUs even though
// 'vport-mode manual' is locked ("%Error 222387: Can't modify vport mode.").
// NOTE: called after exiting pon-onu-mng (already in global config mode), so it
// must NOT re-issue 'configure terminal' ("%Error 140303: Invalid input").
export function servicePortConfig(vportIf: string, vlans: string[]): string {
    const lines: string[] = [`interface ${vportIf}`];
    for (let i = 0; i < vlans.length; i++) {
        const sport = i === 0 ? '1' : `${10 + i}`;
        lines.push(`  service-port ${sport} user-vlan ${vlans[i]} vlan ${vlans[i]}`);
    }
    lines.push(`  qos traffic-policy SMARTOLT-1G-DOWN direction egress`);
    lines.push('exit');
    return lines.join('\n');
}

export function parseServicePorts(output: string): string[] {
    const sports: string[] = [];
    for (const m of output.matchAll(/^(\d+)\s+\d+\s+--\s+\d+/gm)) {
        sports.push(m[1]);
    }
    return sports;
}

export function clearServicePortCommand(vportIf: string, sports: string[]) {
    const lines = sports.map(s => `  no service-port ${s}`).join('\n');
    return `
configure terminal
interface ${vportIf}
${lines}
exit
`;
}

export function updateServiceCommand(params: {
    portInfo: string;
    onuId: string;
    vlans: string;
    mode: 'bridge' | 'route';
    dhcp?: string;
    wanIpSource?: string;
    wanIpv4?: string;
    wanMask?: string;
    wanGw?: string;
    wanDns1?: string;
    wanDns2?: string;
    pppoeUser?: string;
    pppoePass?: string;
    wanRemote?: string;
    onuType?: string;
}) {
    const interfacePort = toOnuInterface(params.portInfo);
    const vlansList = params.vlans.toString().split(',').map(v => v.trim()).filter(Boolean);
    const mainVlan = vlansList[0] || '125';
    const ethUni = `${uniPrefix(params.onuType)}1`;

    let mngServiceConfig = '';
    for (let i = 0; i < vlansList.length; i++) {
        mngServiceConfig += `  service ${i + 1} gemport 1 vlan ${vlansList[i]}\n`;
    }
    mngServiceConfig += '  veip 1\n';

    let portModeConfig = '';
    if (params.mode === 'bridge') {
        // Changing 'mode hybrid def-vlan X' on an already-hybrid port errors
        // with %Error 223982 (def-vlan can only be set once, from the default
        // state). 'mode hybrid' + 'vlan <list>' is accepted from any state and
        // replaces the VLAN list, so it is safe to re-apply on updates.
        portModeConfig += `  vlan port ${ethUni} mode hybrid\n  vlan port ${ethUni} vlan ${vlansList.join(',')}`;
    } else {
         portModeConfig += `  wan-ip ipv4 ping-response enable traceroute-response enable\n`;
         
         if (params.dhcp === 'PPPoE') {
             portModeConfig += `  wan-ip ipv4 mode pppoe username ${params.pppoeUser || ''} password ${params.pppoePass || ''} vlan-profile SMARTOLT_VLAN_${mainVlan} host 1\n`;
         } else if (params.dhcp === 'Static IP' && params.wanIpSource === 'Manual IP') {
             portModeConfig += `  wan-ip ipv4 mode static ip ${params.wanIpv4 || '0.0.0.0'} mask ${params.wanMask || '255.255.255.0'} gw ${params.wanGw || '0.0.0.0'} primary-dns ${params.wanDns1 || '8.8.8.8'} secondary-dns ${params.wanDns2 || '8.8.4.4'} vlan-profile SMARTOLT_VLAN_${mainVlan} host 1\n`;
         } else {
             // Default to DHCP
             portModeConfig += `  wan-ip ipv4 mode dhcp vlan-profile SMARTOLT_VLAN_${mainVlan} host 1\n`;
         }

         portModeConfig += `  wan 1 service internet host 1\n`;

         if (vlansList.length > 1) {
             // Map extra VLANs (e.g. Hotspot) to bridge on the first eth UNI
             const extraVlans = vlansList.slice(1).join(',');
             portModeConfig += `  vlan port ${ethUni} mode hybrid def-vlan ${vlansList[1]}\n  vlan port ${ethUni} vlan ${extraVlans}`;
         }
    }

    const gponBlock = vlansList.length > 0
        ? `gpon\n${vlansList.map(v => `  onu profile vlan SMARTOLT_VLAN_${v} tag-mode tag cvlan ${v}`).join('\n')}\nexit\n`
        : '';

    const vportIf = vportInterface(params.portInfo, params.onuId);

    return `
configure terminal
${gponBlock}pon-onu-mng ${interfacePort}:${params.onuId}
${mngServiceConfig.trimEnd()}
${portModeConfig}
exit
interface ${vportIf}
${vlansList.map((v, i) => `  service-port ${i === 0 ? '1' : `${10 + i}`} user-vlan ${v} vlan ${v}`).join('\n')}
  qos traffic-policy SMARTOLT-1G-DOWN direction egress
exit
`;
}
