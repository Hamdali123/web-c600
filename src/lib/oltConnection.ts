import { Client } from 'ssh2';
import * as ZteC600 from './vendors/zte-c600';
import * as Huawei from './vendors/huawei';

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

// Mutex lock to prevent concurrent Telnet/SSH sessions to the same OLT hardware
let lockPromise = Promise.resolve();

async function acquireLock() {
  let release: () => void = () => {};
  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const oldLock = lockPromise;
  lockPromise = newLock;
  await oldLock;
  return release;
}

export async function executeOltCommand(creds: OltCredentials, command: string): Promise<string> {
  const release = await acquireLock();
  try {
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
           timeout: 180000,
           negotiationMandatory: false,
           disableLogon: true
        });

       const promptRegex = /[#>]\s*$/i;

       // Try to send username directly assuming OLT already sent "Username: " prompt
       try {
           await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, timeout: 5000 });
       } catch (e) {
           // Fallback: trigger login prompt first (some OLTs need a newline)
           await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, timeout: 5000 }).catch(() => null);
           await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, timeout: 5000 });
       }
       
       // Send password and wait for shell prompt
       await connection.send(creds.password || '', { waitFor: promptRegex, timeout: 10000 });
       
       // Disable pagination before sending commands
       try {
         await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 });
       } catch (e) {
         try { await connection.send('length 0', { waitFor: promptRegex, timeout: 5000 }); } catch (err) {}
       }

       let fullOutput = '';
       for (const line of lines) {
           const out = await connection.send(line, { waitFor: promptRegex, timeout: 60000 });
           fullOutput += out + '\n';
       }

       await connection.end();
       return fullOutput;

       } catch (error: any) {
           try { await connection.destroy(); } catch (e) {}
           throw new Error(`Telnet connection failed: ${error.message}`);
       }
  }
  } finally {
    release();
  }
}

export async function executeOltCommandBatch(creds: OltCredentials, commands: string[]): Promise<string[]> {
  const release = await acquireLock();
  try {
    if (creds.protocol === 'ssh') {
      const Client = require('ssh2').Client;
      return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
          conn.shell((err: any, stream: any) => {
            if (err) { conn.end(); return reject(err); }
            const outputs: string[] = [];
            let currentLine = 0;
            let currentOutput = '';
            
            stream.on('close', () => { conn.end(); resolve(outputs); }).on('data', (data: any) => {
              const chunk = data.toString();
              currentOutput += chunk;
              if (chunk.includes('#') || chunk.includes('>')) {
                 if (currentLine > 0) outputs.push(currentOutput);
                 currentOutput = '';
                 if (currentLine < commands.length) {
                   stream.write(commands[currentLine] + '\n');
                   currentLine++;
                 } else {
                   setTimeout(() => stream.end('exit\n'), 500);
                 }
              }
            });
            stream.write('\n'); // Trigger prompt
          });
        }).on('error', reject).connect({
          host: creds.ip, port: creds.port || 22, username: creds.username, password: creds.password, readyTimeout: 10000
        });
      });
    } else {
       const Telnet = require('telnet-client').Telnet;
       const connection = new Telnet();
       try {
        await connection.connect({
           host: creds.ip, port: creds.port || 23, timeout: 180000, negotiationMandatory: false, disableLogon: true
        });
       const promptRegex = /[#>]\s*$/i;
       try {
           await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, timeout: 5000 });
       } catch (e) {
           await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, timeout: 5000 }).catch(() => null);
           await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, timeout: 5000 });
       }
       await connection.send(creds.password || '', { waitFor: promptRegex, timeout: 10000 });
       
       try {
         await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 });
       } catch (e) {
         try { await connection.send('length 0', { waitFor: promptRegex, timeout: 5000 }); } catch (err) {}
       }

       const outputs: string[] = [];
       for (const cmd of commands) {
           const out = await connection.send(cmd, { waitFor: promptRegex, timeout: 60000 });
           outputs.push(out);
       }
       await connection.end();
       return outputs;

       } catch (error: any) {
           try { await connection.destroy(); } catch (e) {}
           throw new Error(`Telnet connection failed: ${error.message}`);
       }
    }
  } finally {
    release();
  }
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
        const script = ZteC600.authorizeOnuCommand(params);
        return await executeOltCommand(creds, script);
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.authorizeOnuCommand(params);
        return await executeOltCommand(creds, script);
    }
    return "Vendor not supported for auto-auth";
}

export async function rebootOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
    if (creds.vendor === 'zte') {
        const script = ZteC600.rebootOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script);
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.rebootOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script);
    }
    return '';
}

export async function deleteOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
    if (creds.vendor === 'zte') {
        const script = ZteC600.deleteOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script);
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.deleteOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script);
    }
    return '';
}

export async function enableOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
   if (creds.vendor === 'zte') {
      const script = ZteC600.enableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script);
   } else {
      const script = Huawei.enableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script);
   }
}

export async function disableOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
   if (creds.vendor === 'zte') {
      const script = ZteC600.disableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script);
   } else {
      const script = Huawei.disableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script);
   }
}

export async function getRunningConfig(creds: OltCredentials, params: { portInfo: string, onuId: string }) {
    if (creds.vendor === 'zte') {
        const script = ZteC600.getRunningConfigCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script);
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.getRunningConfigCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script);
    }
    return "Not supported";
}

export async function getOltMetrics(creds: OltCredentials) {
    let cpu = 0, mem = 0, temp = 0;
    try {
        if (creds.vendor === 'zte') {
            const output = await executeOltCommand(creds, ZteC600.getMetricsCommand());
            const cpuMatch = output.match(/CPU utilization.*?(\d+)/i);
            const memMatch = output.match(/Memory utilization.*?(\d+)/i);
            const tempMatch = output.match(/Temperature.*?(\d+)/i);
            if (cpuMatch) cpu = parseInt(cpuMatch[1]);
            if (memMatch) mem = parseInt(memMatch[1]);
            if (tempMatch) temp = parseInt(tempMatch[1]);
        } else if (creds.vendor === 'huawei') {
            const output = await executeOltCommand(creds, Huawei.getMetricsCommand());
            const metrics = Huawei.parseMetrics(output);
            cpu = metrics.cpu; mem = metrics.mem; temp = metrics.temp;
        }
    } catch (e) {
        console.error("Failed to fetch OLT metrics", e);
    }
    return { cpu, mem, temp };
}

export async function getOltCards(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, ZteC600.getCardsCommand());
        return ZteC600.parseCards(output);
    }
    return [];
}

export async function getOltPonPorts(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        const cmds = ZteC600.getPonPortsCommand().split('\n');
        const interfaceOutput = await executeOltCommand(creds, cmds[0]).catch(() => '');
        const stateOutput = await executeOltCommand(creds, cmds[1]).catch(() => '');
        const cardsOutput = await executeOltCommand(creds, cmds[2]).catch(() => '');
        return ZteC600.parsePonPorts(stateOutput, cardsOutput);
    }
    return [];
}

export async function getOltUplinkPorts(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, ZteC600.getUplinkPortsCommand());
        return ZteC600.parseUplinkPorts(output);
    }
    return [];
}

export async function saveConfig(creds: OltCredentials) {
    if (creds.vendor === 'zte') {
        return await executeOltCommand(creds, ZteC600.getSaveCommand());
    } else {
        return await executeOltCommand(creds, Huawei.getSaveCommand());
    }
}

export async function getVlans(creds: OltCredentials) {
  const { PrismaClient } = require('@prisma/client');
  const prismaLocal = new PrismaClient();
  const vlans = await prismaLocal.vLAN.findMany();
  return vlans.map((v: any) => ({
      id: v.vlan_id,
      desc: v.description
  }));
}

export function parseOltAttenuation(output: string) {
    const lines = output.split('\n');
    let onuRx = '-40.0';
    let onuTx = '-40.0';
    let oltRx = '-40.0';
    let oltTx = '-40.0';

    for (const line of lines) {
        if (line.includes('ONU(')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                onuRx = parts[1];
                onuTx = parts[2];
            }
        } else if (line.includes('OLT(')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                oltRx = parts[1];
                oltTx = parts[2];
            }
        }
    }
    
    return {
        onu_rx_power: onuRx !== 'N/A' ? onuRx : '-40.0',
        onu_tx_power: onuTx !== 'N/A' ? onuTx : '-40.0',
        olt_rx_power: oltRx !== 'N/A' ? oltRx : '-40.0',
        olt_tx_power: oltTx !== 'N/A' ? oltTx : '-40.0'
    };
}

export async function readOltAttenuation(creds: OltCredentials, onuInterface: string) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, `show pon power attenuation ${onuInterface}`);
        return parseOltAttenuation(output);
    } else {
        return { onu_rx_power: '-40.0', onu_tx_power: '-40.0', olt_rx_power: '-40.0', olt_tx_power: '-40.0' };
    }
}

export function parseOnuDetails(output: string) {
    const distanceMatch = output.match(/distance.*?(\d+)/i);
    const versionMatch = output.match(/version.*?([A-Za-z0-9.]+)/i);
    return {
        distance: distanceMatch ? distanceMatch[1] + 'm' : 'N/A',
        firmware: versionMatch ? versionMatch[1] : 'N/A',
        uptime: null,
        voip_status: 'Down',
        tv_status: 'Down'
    };
}

export async function getOnuDetails(creds: OltCredentials, onuInterface: string, onuId: string) {
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, `show gpon onu detail-info ${onuInterface}`);
        return parseOnuDetails(output);
    } else {
        return { distance: 'N/A', firmware: 'N/A' };
    }
}
