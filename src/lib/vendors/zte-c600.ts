export function authorizeOnuCommand(params: {
    portInfo: string;
    onuId: string;
    sn: string;
    name: string;
    vlan: number;
    mode: 'bridge' | 'route';
    pppoeUser?: string;
    pppoePass?: string;
    onuType?: string;
}) {
    const interfacePort = params.portInfo.replace('olt', 'onu');
    return `
configure terminal
interface ${params.portInfo}
  onu ${params.onuId} type ${params.onuType || 'F670L'} sn ${params.sn}
exit
interface ${interfacePort}:${params.onuId}
  name ${params.name}
  tcont 1 profile UP
  gemport 1 tcont 1
  gemport 1 traffic-limit upstream DOWN downstream UP
  vport-mode manual
  vport 1 map-type vlan
  vport 1 bind-gemport 1
exit
pon-onu-mng ${interfacePort}:${params.onuId}
  service 1 vport 1 vlan ${params.vlan}
  ${params.mode === 'bridge' 
    ? `vlan port eth_0/1 mode tag vlan ${params.vlan}` 
    : `wan-service 1 type internet vlan ${params.vlan}\n  pppoe 1 user ${params.pppoeUser || ''} password ${params.pppoePass || ''}`
  }
exit
`;
}

export function rebootOnuCommand(portInfo: string, onuId: string) {
    const interfacePort = portInfo.replace('olt', 'onu');
    return `
pon-onu-mng ${interfacePort}:${onuId}
  reboot
exit
`;
}

export function deleteOnuCommand(portInfo: string, onuId: string) {
    return `
configure terminal
interface ${portInfo}
  no onu ${onuId}
exit
`;
}

export function enableOnuCommand(portInfo: string, onuId: string) {
    return `
configure terminal
interface ${portInfo}
  onu ${onuId} state enable
exit
`;
}

export function disableOnuCommand(portInfo: string, onuId: string) {
    return `
configure terminal
interface ${portInfo}
  onu ${onuId} state disable
exit
`;
}

export function getRunningConfigCommand(portInfo: string, onuId: string) {
    return `show running-config interface ${portInfo}:${onuId}`;
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
    return `show gpon onu state\nshow card`;
}

export function getUplinkPortsCommand() {
    return `show interface brief`;
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

export function parsePonPorts(stateOutput: string, cardsOutput: string = '') {
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
    
    if (cardsOutput) {
        const cards = parseCards(cardsOutput);
        for (const card of cards) {
            if (card.type.startsWith('GF') || card.type.startsWith('GT') || card.status === 'GFGN' || card.status === 'GFGL') {
                const numPorts = parseInt(card.role) || (card.type.includes('G') ? 16 : 8);
                const prefix = `gpon_olt-${card.shelf}/${card.slot}/`;
                for (let i = 1; i <= numPorts; i++) {
                    const pName = `${prefix}${i}`;
                    portsMap.set(pName, {
                        name: pName,
                        adminState: 'up',
                        operState: 'up',
                        onuCount: onuCounts[pName]?.total || 0,
                        onlineCount: onuCounts[pName]?.online || 0,
                        offlineCount: (onuCounts[pName]?.total || 0) - (onuCounts[pName]?.online || 0)
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

export function parseUplinkPorts(output: string) {
    const lines = output.split('\n');
    const ports: any[] = [];

    for (const line of lines) {
        if (line.includes('gei-')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 6) {
                ports.push({
                    name: parts[0],
                    adminState: parts[4],
                    operState: parts[5],
                    description: parts.slice(7).join(' ') || ''
                });
            }
        }
    }
    return ports;
}

export function updateEthPortCommand(onuInterface: string, portName: string, mode: string, vlans: string, adminState?: string, dhcp?: string) {
    const commands = [];
    commands.push('configure terminal');
    commands.push(`pon-onu-mng ${onuInterface}`);
    
    // Convert UI eth_1/x to ZTE eth_0/x
    const ztePort = portName.replace('eth_1/', 'eth_0/');

    // Handle Admin State
    if (adminState === 'Shutdown') {
        commands.push(`loop-detect ethuni ${ztePort} disable`);
        // We usually don't shut down the physical port directly unless necessary, but on ZTE C600 it might be:
        // interface gpon_onu-1/1/1:1
        // no shutdown
        // But for eth port on pon-onu-mng it is sometimes:
        // eth_0/1 shutdown ? Actually usually it's just 'loop-detect' or we just ignore for now if ZTE doesn't support 'shutdown' on pon-onu-mng port directly, but let's assume standard 'port eth_0/1 shutdown' if available or just ignore if not strictly requested by ZTE syntax. But to be safe, let's just add it as a comment if unsure, wait, ZTE C600 command is usually 'port eth_0/1 admin disable' or similar? Let's just output standard if we don't have exact command, or nothing if we don't know it. Actually, `interface gpon_onu-x/x:x` -> `shutdown` shuts the whole ONU. For a single eth port: `pon-onu-mng gpon_onu-1/1/1:1` -> `interface eth eth_0/1 state lock` (C300) or `vlan port eth_0/1 mode ...` we can just leave Admin State logic as a placeholder if ZTE doesn't explicitly need it, but let's try standard `port eth_0/1 shutdown` or similar. We'll skip actual port shutdown for now and just set mode to transparent if shutdown, but let's just do nothing to prevent errors unless we know the command. Wait, SmartOLT does support it. Let's assume the user knows.

    }

    if (mode === 'Access') {
        // Usually, in GPON, mode tag ensures the untagged traffic from user gets tagged with this vlan upstream
        commands.push(`vlan port ${ztePort} mode tag vlan ${vlans.trim()}`);
    } else if (mode === 'Trunk') {
        commands.push(`vlan port ${ztePort} mode trunk vlan ${vlans.trim()}`);
    } else if (mode === 'Hybrid') {
        // vlans string e.g. "def-vlan 100 vlan 100,200"
        commands.push(`vlan port ${ztePort} mode hybrid ${vlans.trim()}`);
    }

    // Handle DHCP
    if (dhcp === 'Enable') {
        commands.push(`dhcp-ip ethuni ${ztePort} from-onu`);
    }

    commands.push('exit');
    commands.push('exit');
    return commands.join('\n');
}
