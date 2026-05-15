import { Client } from 'ssh2';
const telnetModule = require('telnet-client');
const Telnet = telnetModule.Telnet || telnetModule;

export interface OltCredentials {
  ip: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'ssh' | 'telnet';
  vendor: 'zte' | 'huawei';
}

export async function executeOltCommand(creds: OltCredentials, command: string): Promise<string> {
  const lines = command.trim().split('\n');
  
  if (creds.protocol === 'ssh') {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';

      conn.on('ready', () => {
        conn.shell((err, stream) => {
          if (err) return reject(err);

          let currentLine = 0;
          stream.on('close', () => {
            conn.end();
            resolve(output);
          }).on('data', (data: any) => {
            const chunk = data.toString();
            output += chunk;
            
            // Wait for prompt before sending next line
            if (chunk.includes('#') || chunk.includes('>')) {
               if (currentLine < lines.length) {
                 stream.write(lines[currentLine] + '\n');
                 currentLine++;
               } else {
                 setTimeout(() => stream.end('exit\n'), 500);
               }
            }
          });
        });
      }).on('error', reject).connect({
        host: creds.ip, port: creds.port || 22, username: creds.username, password: creds.password, readyTimeout: 10000
      });
    });
  } else {
     const connection = new Telnet();
     try {
       await connection.connect({
          host: creds.ip, 
          port: creds.port || 23, 
          username: creds.username, 
          password: creds.password, 
          shellPrompt: /#|>$/, 
          loginPrompt: /(Login|Username|name)[: ]*$/i,
          passwordPrompt: /(Password|word)[: ]*$/i,
          timeout: 10000,
          initialLineFeed: true
       });
       
       let totalOutput = '';
       for (const line of lines) {
         const res = await connection.send(line);
         totalOutput += res + '\n';
       }
       
       await connection.destroy();
       return totalOutput;
     } catch(e) {
       await connection.destroy();
       throw e;
     }
  }
}

export async function readOltAttenuation(creds: OltCredentials, onuPortInfo: string) {
   let command = creds.vendor === 'zte' 
       ? `show pon power attenuation ${onuPortInfo}` 
       : `display ont optical-info ${onuPortInfo}`;
   const output = await executeOltCommand(creds, command);
   return parseAttenuation(output, creds.vendor);
}

export async function getOnuDetails(creds: OltCredentials, port: string, onuId: string) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, `show gpon onu detail-info ${port}:${onuId}`);
        return parseZteOnuDetail(output);
    }
    return {};
}

function parseZteOnuDetail(raw: string) {
    const details: any = { raw_output: raw };
    
    // Distance
    const distMatch = raw.match(/OMCC\s+distance\s*:\s*(\d+)/i);
    if (distMatch) details.distance = `${distMatch[1]} m`;
    
    // Uptime
    const uptimeMatch = raw.match(/Online\s+duration\s*:\s*(.*)/i);
    if (uptimeMatch) details.uptime = uptimeMatch[1].trim();

    // State
    const stateMatch = raw.match(/Phase\s+state\s*:\s*(\w+)/i);
    if (stateMatch) details.state = stateMatch[1];

    // VoIP Status
    const voipMatch = raw.match(/VoIP\s+state\s*:\s*(\w+)/i) || raw.match(/POTS\s+status\s*:\s*(\w+)/i);
    if (voipMatch) details.voip_status = voipMatch[1].toLowerCase() === 'up' || voipMatch[1].toLowerCase() === 'working' ? 'Up' : 'Down';

    // TV / CATV Status
    const tvMatch = raw.match(/CATV\s+status\s*:\s*(\w+)/i) || raw.match(/Video\s+status\s*:\s*(\w+)/i);
    if (tvMatch) details.tv_status = tvMatch[1].toLowerCase() === 'up' || tvMatch[1].toLowerCase() === 'enabled' ? 'Up' : 'Down';

    return details;
}

function parseAttenuation(rawText: string, vendor: string) {
  let onuRx = "N/A";
  let onuTx = "N/A";
  if (vendor === 'zte') {
     const rxMatch = rawText.match(/ONU\s+Rx\s+power.*?(?:-\d+\.\d+|\d+\.\d+)/i) || rawText.match(/Rx\s+power.*?(?:-\d+\.\d+|\d+\.\d+)/i);
     const txMatch = rawText.match(/ONU\s+Tx\s+power.*?(?:-\d+\.\d+|\d+\.\d+)/i) || rawText.match(/Tx\s+power.*?(?:-\d+\.\d+|\d+\.\d+)/i);
     if (rxMatch) onuRx = rxMatch[0].match(/(-\d+\.\d+|\d+\.\d+)/)?.[0] || "N/A";
     if (txMatch) onuTx = txMatch[0].match(/(-\d+\.\d+|\d+\.\d+)/)?.[0] || "N/A";
  } else if (vendor === 'huawei') {
     const rxMatch = rawText.match(/Rx\s+optical\s+power\(dBm\)\s*:\s*(-\d+\.\d+|\d+\.\d+)/i);
     const txMatch = rawText.match(/Tx\s+optical\s+power\(dBm\)\s*:\s*(-\d+\.\d+|\d+\.\d+)/i);
     if (rxMatch) onuRx = rxMatch[1];
     if (txMatch) onuTx = txMatch[1];
  }
  return { onu_rx_power: onuRx, onu_tx_power: onuTx, raw_output: rawText };
}

export async function createOnu(creds: OltCredentials, params: {
   portInfo: string;
   onuId: string;
   sn: string;
   name: string;
   vlan: string;
   mode: 'bridge' | 'route';
   pppoeUser?: string;
   pppoePass?: string;
   onuType: string;
}) {
   if (creds.vendor === 'zte') {
      const script = `
config t
interface ${params.portInfo}
  onu ${params.onuId} type ${params.onuType} sn ${params.sn}
exit
interface ${params.portInfo.replace('olt', 'onu')}:${params.onuId}
  name ${params.name}
  tcont 1 profile UP
  gemport 1 tcont 1
  gemport 1 traffic-limit upstream DOWN downstream UP
exit
interface vport-${params.portInfo.replace('gpon-olt', 'gpon')}:${params.onuId}:1
  vlan mode tag vlan ${params.vlan}
exit
pon-onu-mng ${params.portInfo.replace('olt', 'onu')}:${params.onuId}
  service 1 gemport 1 vlan ${params.vlan}
  ${params.mode === 'bridge' 
    ? `vlan port eth_0/1 mode tag vlan ${params.vlan}` 
    : `wan-service 1 type internet vlan ${params.vlan}
  pppoe 1 user ${params.pppoeUser} password ${params.pppoePass}`
  }
exit
`;
      return await executeOltCommand(creds, script);
   } else {
      const script = `
config
interface ${params.portInfo}
  ont add ${params.portInfo.split('_')[1]} ${params.onuId} sn-auth ${params.sn} omci ont-lineprofile-id 1 ont-srvprofile-id 1 desc "${params.name}"
  ont port native-vlan ${params.portInfo.split('_')[1]} ${params.onuId} eth 1 vlan ${params.vlan}
quit
service-port vlan ${params.vlan} gpon ${params.portInfo.split('_')[1]} ont ${params.onuId} gemport 1 multi-service user-vlan ${params.vlan}
`;
      return await executeOltCommand(creds, script);
   }
}

export async function deleteOnu(creds: OltCredentials, params: {
   portInfo: string;
   onuId: string;
}) {
   if (creds.vendor === 'zte') {
      const script = `
config t
interface ${params.portInfo}
  no onu ${params.onuId}
exit
`;
      return await executeOltCommand(creds, script);
   } else {
      const script = `
config
interface ${params.portInfo}
  ont delete ${params.portInfo.split('_')[1]} ${params.onuId}
quit
`;
      return await executeOltCommand(creds, script);
   }
}

export async function rebootOnu(creds: OltCredentials, params: {
   portInfo: string;
   onuId: string;
}) {
   if (creds.vendor === 'zte') {
      const script = `
config t
pon-onu-mng ${params.portInfo.replace('olt', 'onu')}:${params.onuId}
  reboot
exit
`;
      return await executeOltCommand(creds, script);
   } else {
      const script = `
config
interface ${params.portInfo}
  ont reset ${params.portInfo.split('_')[1]} ${params.onuId}
quit
`;
      return await executeOltCommand(creds, script);
   }
}
export async function enableOnu(creds: OltCredentials, params: {
   portInfo: string;
   onuId: string;
}) {
   if (creds.vendor === 'zte') {
      const script = `
config t
interface ${params.portInfo}
  onu ${params.onuId} state enable
exit
`;
      return await executeOltCommand(creds, script);
   } else {
      const script = `
config
interface ${params.portInfo}
  ont activate ${params.portInfo.split('_')[1]} ${params.onuId}
quit
`;
      return await executeOltCommand(creds, script);
   }
}

export async function disableOnu(creds: OltCredentials, params: {
   portInfo: string;
   onuId: string;
}) {
   if (creds.vendor === 'zte') {
      const script = `
config t
interface ${params.portInfo}
  onu ${params.onuId} state disable
exit
`;
      return await executeOltCommand(creds, script);
   } else {
      const script = `
config
interface ${params.portInfo}
  ont deactivate ${params.portInfo.split('_')[1]} ${params.onuId}
quit
`;
      return await executeOltCommand(creds, script);
   }
}

export async function getVlans(creds: OltCredentials) {
  const command = creds.vendor === 'zte' ? 'show vlan' : 'display vlan all';
  const output = await executeOltCommand(creds, command);
  if (creds.vendor === 'zte') return parseZteVlans(output);
  return [];
}

function parseZteVlans(output: string) {
    const lines = output.split('\n');
    const vlans: any[] = [];
    let startParsing = false;

    for (const line of lines) {
        if (line.includes('---')) {
            startParsing = true;
            continue;
        }
        if (!startParsing) continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const id = parseInt(parts[0]);
            if (!isNaN(id)) {
                vlans.push({
                    id: id,
                    desc: parts.slice(2).join(' ') || `VLAN ${id}`
                });
            }
        }
    }
    return vlans;
}

export async function authorizeOnu(creds: OltCredentials, params: {
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
    if (creds.vendor === 'zte') {
        const portType = params.portInfo.toLowerCase().includes('gpon') ? 'gpon' : 'epon';
        const interfacePort = params.portInfo.replace('olt', 'onu');
        const vportPort = params.portInfo.replace('olt', '').replace('-', ''); // gponolt -> gpon
        
        const script = `
configure terminal
interface ${params.portInfo}
  onu ${params.onuId} type ${params.onuType || 'F670L'} sn ${params.sn}
exit
interface ${interfacePort}:${params.onuId}
  name ${params.name}
  tcont 1 profile UP
  gemport 1 tcont 1
  gemport 1 traffic-limit upstream DOWN downstream UP
exit
interface vport-${vportPort}:${params.onuId}:1
  vlan mode tag vlan ${params.vlan}
exit
pon-onu-mng ${interfacePort}:${params.onuId}
  service 1 gemport 1 vlan ${params.vlan}
  ${params.mode === 'bridge' 
    ? `vlan port eth_0/1 mode tag vlan ${params.vlan}` 
    : `wan-service 1 type internet vlan ${params.vlan}
  pppoe 1 user ${params.pppoeUser || ''} password ${params.pppoePass || ''}`
  }
exit
`;
        return await executeOltCommand(creds, script);
    } else if (creds.vendor === 'huawei') {
        const portParts = params.portInfo.split('_'); // e.g. gpon-olt_0/1/1
        const frameSlotPort = portParts[1]; 
        
        const script = `
config
interface ${params.portInfo}
  ont add ${frameSlotPort} ${params.onuId} sn-auth ${params.sn} omci ont-lineprofile-id 1 ont-srvprofile-id 1 desc "${params.name}"
  ont port native-vlan ${frameSlotPort} ${params.onuId} eth 1 vlan ${params.vlan}
quit
service-port vlan ${params.vlan} gpon ${frameSlotPort} ont ${params.onuId} gemport 1 multi-service user-vlan ${params.vlan}
`;
        return await executeOltCommand(creds, script);
    }
    return "Vendor not supported for auto-auth";
}
export async function getRunningConfig(creds: OltCredentials, params: { portInfo: string, onuId: string }) {
    if (creds.vendor === 'zte') {
        const script = `show running-config interface ${params.portInfo}:${params.onuId}`;
        return await executeOltCommand(creds, script);
    } else if (creds.vendor === 'huawei') {
        const script = `display current-configuration ont ${params.portInfo.split('_')[1]} ${params.onuId}`;
        return await executeOltCommand(creds, script);
    }
    return "Not supported";
}

export async function getOltMetrics(creds: OltCredentials) {
    let cpu = 0, mem = 0, temp = 0;
    try {
        if (creds.vendor === 'zte') {
            const output = await executeOltCommand(creds, 'show processor');
            // ZTE usually shows CPU and Memory in 'show processor' output
            // Example: CPU utilization: 12%  Memory utilization: 45%
            const cpuMatch = output.match(/CPU utilization.*?(\d+)/i);
            const memMatch = output.match(/Memory utilization.*?(\d+)/i);
            if (cpuMatch) cpu = parseInt(cpuMatch[1]);
            if (memMatch) mem = parseInt(memMatch[1]);

            // Temp is usually in 'show card' or 'show temperature'
            const tempOutput = await executeOltCommand(creds, 'show card');
            const tempMatch = tempOutput.match(/Temperature.*?(\d+)/i);
            if (tempMatch) temp = parseInt(tempMatch[1]);
        } else if (creds.vendor === 'huawei') {
            const output = await executeOltCommand(creds, 'display board 0/0');
            // Huawei example logic
            const cpuMatch = output.match(/CPU usage.*?(\d+)/i);
            const memMatch = output.match(/Memory usage.*?(\d+)/i);
            const tempMatch = output.match(/Temperature.*?(\d+)/i);
            if (cpuMatch) cpu = parseInt(cpuMatch[1]);
            if (memMatch) mem = parseInt(memMatch[1]);
            if (tempMatch) temp = parseInt(tempMatch[1]);
        }
    } catch (e) {
        console.error("Failed to fetch OLT metrics", e);
    }
    return { cpu, mem, temp };
}

export async function getOltCards(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, 'show card');
        return parseZteCards(output);
    }
    return [];
}

export async function getOltPonPorts(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        const interfaceOutput = await executeOltCommand(creds, 'show interface gpon-olt');
        const stateOutput = await executeOltCommand(creds, 'show gpon onu state');
        return parseZtePonPorts(interfaceOutput, stateOutput);
    }
    return [];
}

export async function getOltUplinkPorts(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, 'show interface gei');
        return parseZteUplinkPorts(output);
    }
    return [];
}

export async function saveConfig(creds: OltCredentials) {
    const command = creds.vendor === 'zte' ? 'write' : 'save';
    return await executeOltCommand(creds, command);
}

function parseZteUplinkPorts(output: string) {
    const lines = output.split('\n');
    const ports: any[] = [];
    let startParsing = false;

    for (const line of lines) {
        if (line.toLowerCase().includes('interface') && line.toLowerCase().includes('adminstate')) {
            startParsing = true;
            continue;
        }
        if (!startParsing || line.includes('---')) continue;

        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
            ports.push({
                name: parts[0],
                adminState: parts[1],
                operState: parts[2],
                description: parts.slice(3).join(' ')
            });
        }
    }
    return ports;
}

function parseZteCards(output: string) {
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

function parseZtePonPorts(interfaceOutput: string, stateOutput: string) {
    const lines = interfaceOutput.split('\n');
    const ports: any[] = [];
    let startParsing = false;

    // Parse ONU states first to count them
    const onuCounts: Record<string, { total: number, online: number }> = {};
    const stateLines = stateOutput.split('\n');
    let stateParsing = false;
    for (const line of stateLines) {
        if (line.includes('---')) { stateParsing = true; continue; }
        if (!stateParsing) continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
            const fullPort = parts[0]; // e.g. gpon-onu_0/1/1:1
            const portName = fullPort.split(':')[0].replace('onu', 'olt'); // gpon-olt_0/1/1
            const state = parts[2]; // working, offline, etc.
            
            if (!onuCounts[portName]) onuCounts[portName] = { total: 0, online: 0 };
            onuCounts[portName].total++;
            if (state.toLowerCase() === 'working') onuCounts[portName].online++;
        }
    }

    for (const line of lines) {
        if (line.toLowerCase().includes('interface') && line.toLowerCase().includes('adminstate')) {
            startParsing = true;
            continue;
        }
        if (!startParsing || line.includes('---')) continue;

        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
            const name = parts[0];
            ports.push({
                name: name,
                adminState: parts[1],
                operState: parts[2],
                description: parts.slice(3).join(' '),
                onus_total: onuCounts[name]?.total || 0,
                onus_online: onuCounts[name]?.online || 0
            });
        }
    }
    return ports;
}
