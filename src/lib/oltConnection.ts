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

export interface OltCommandOptions {
  /** When true, throw if the OLT returns a '%Error' line (config writes should always fail loudly). */
  failOnError?: boolean;
}

// ZTE C600 rejects config commands with '%Error <code>: <reason>'. Fail silently
// means the DB gets saved with a config the OLT never actually applied (ONU 'ada
// tapi nggak konek'). Detect and surface these.
function assertCliOk(output: string, opts?: OltCommandOptions) {
  if (!opts?.failOnError) return;
  const errorLine = output.split('\n').find(l => /%Error\s*\d*:/.test(l));
  if (errorLine) {
    throw new Error(errorLine.trim());
  }
}

/**
 * Normalize pon_port from DB to ONU interface format.
 * Handles both 'gpon-olt_1/2/13' and 'gpon_olt-1/2/13' formats.
 * toOnu=true  -> 'gpon_onu-1/2/13'
 * toOnu=false -> 'gpon_olt-1/2/13'
 */
export function normalizePonPort(ponPort: string, toOnu = true): string {
  const stripped = ponPort.replace(/^gpon[-_]olt[-_]/i, '');
  return toOnu ? `gpon_onu-${stripped}` : `gpon_olt-${stripped}`;
}

// Per-OLT mutex lock to prevent concurrent Telnet/SSH sessions to the SAME OLT hardware
// Each OLT IP gets its own lock — different OLTs can work in parallel
const oltLocks: Map<string, Promise<void>> = new Map();

async function acquireLock(oltIp: string = '_global') {
  const currentLock = oltLocks.get(oltIp) ?? Promise.resolve();
  let release: () => void = () => {};
  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  oltLocks.set(oltIp, newLock);
  await currentLock;
  return release;
}

export async function executeOltCommand(creds: OltCredentials, command: string, opts?: OltCommandOptions): Promise<string> {
  const release = await acquireLock(creds.ip);
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
            try { assertCliOk(output, opts); } catch (e) { return reject(e); }
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
    const runTelnet = async (): Promise<string> => {
      const connection = new Telnet();
      try {
        await connection.connect({
           host: creds.ip, 
           port: creds.port || 23, 
           timeout: 180000,
           negotiationMandatory: false,
           disableLogon: true
        });

       const promptRegex = /[#>]\s*$|\[yes\/no\]:?\s*$|\(y\/n\)\[n\]:?\s*$/i;

       // Try to send username directly assuming OLT already sent "Username: " prompt
       try {
           await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, execTimeout: 5000 });
       } catch (e) {
           // Fallback: trigger login prompt first (some OLTs need a newline)
           await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, execTimeout: 5000 }).catch(() => null);
           await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, execTimeout: 5000 });
       }
       
       // Send password and wait for shell prompt
       await connection.send(creds.password || '', { waitFor: promptRegex, execTimeout: 10000 });
       
       // Disable pagination before sending commands
       try {
         await connection.send('terminal length 0', { waitFor: promptRegex, execTimeout: 5000 });
       } catch (e) {
         try { await connection.send('length 0', { waitFor: promptRegex, execTimeout: 5000 }); } catch (err) {}
       }

       let fullOutput = '';
       for (const line of lines) {
           if (!connection.socket || !connection.socket.writable) {
               // Session was closed by the OLT mid-script (e.g. an 'exit' logged out
               // after an earlier command failed). Surface the last output so the
               // real %Error is visible instead of a bare 'socket not writable'.
               throw new Error(`OLT closed the session (socket not writable). Last output:\n${fullOutput.trimEnd().slice(-600)}`);
           }
           const out = await connection.send(line, { waitFor: promptRegex, execTimeout: 60000 });
           fullOutput += out + '\n';
           if (opts?.failOnError) {
               const errorLine = out.split('\n').find((l: string) => /%Error\s*\d*:/.test(l));
               if (errorLine) throw new Error(errorLine.trim());
           }
       }

       // Close the session cleanly: exit config mode then quit so the OLT
       // releases the vty line immediately. Without this, dropped TCP sessions
       // pile up as idle 'show users' lines until the OLT timeout, exhausting
       // the session limit (seen live: ConnectionReset / response not received).
       try { await connection.send('exit', { waitFor: promptRegex, execTimeout: 3000 }); } catch {}
       try { await connection.send('quit', { waitFor: /username|password|login|closed|exit/i, execTimeout: 3000 }); } catch {}
       try { await connection.end(); } catch {}

       if (opts?.failOnError) {
           const errorLine = fullOutput.split('\n').find((l: string) => /%Error\s*\d*:/.test(l));
           if (errorLine) throw new Error(errorLine.trim());
       }
       return fullOutput;
     } catch (error: any) {
       try { await connection.destroy(); } catch (e) {}
       throw error;
     }
    };

    // Retry transient session failures (OLT session limits under worker load)
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await runTelnet();
      } catch (error: any) {
        if (String(error?.message || '').includes('%Error')) throw error;
        lastError = error;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        }
      }
    }
    throw new Error(`Telnet connection failed: ${lastError?.message}`);
   }
  } finally {
    release();
  }
}

export async function executeOltCommandBatch(creds: OltCredentials, commands: string[]): Promise<string[]> {
  const release = await acquireLock(creds.ip);
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
       const runTelnet = async (): Promise<string[]> => {
         const Telnet = require('telnet-client').Telnet;
         const connection = new Telnet();
         try {
          await connection.connect({
             host: creds.ip, port: creds.port || 23, timeout: 180000, negotiationMandatory: false, disableLogon: true
          });
         const promptRegex = /[#>]\s*$|\[yes\/no\]:?\s*$|\(y\/n\)\[n\]:?\s*$/i;
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
         try { await connection.send('exit', { waitFor: promptRegex, timeout: 3000 }); } catch {}
         try { await connection.send('quit', { waitFor: /username|password|login|closed|exit/i, timeout: 3000 }); } catch {}
         try { await connection.end(); } catch {}
         return outputs;

         } catch (error: any) {
            try { await connection.destroy(); } catch (e) {}
            throw error;
         }
       };

       // Retry transient session failures (OLT session limits under worker load)
       let lastError: any = null;
       for (let attempt = 0; attempt < 3; attempt++) {
         try {
           return await runTelnet();
         } catch (error: any) {
           if (String(error?.message || '').includes('%Error')) throw error;
           lastError = error;
           if (attempt < 2) {
             await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
           }
         }
       }
       throw new Error(`Telnet connection failed: ${lastError?.message}`);
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
    vlan: string | number;
    mode: 'bridge' | 'route';
    pppoeUser?: string;
    pppoePass?: string;
    onuType?: string;
    profileName?: string;
    recreate?: boolean;
}) {
    if (creds.vendor === 'zte') {
        const script = ZteC600.authorizeOnuCommand(params);
        return await executeOltCommand(creds, script, { failOnError: true });
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.authorizeOnuCommand(params);
        return await executeOltCommand(creds, script, { failOnError: true });
    }
    return "Vendor not supported for auto-auth";
}

export interface OnuStateEntry {
    onuId: string;
    adminState: string;
    phase: string;
}

/**
 * Query the physical OLT for the current ONU registration table on a PON port,
 * e.g. 'show gpon onu state gpon_olt-1/2/13' → [{ onuId: '1', phase: 'los' }, ...].
 * Used to pick a genuinely free ONU id instead of guessing from the (often stale) DB.
 */
export async function getOnuStateOnPort(creds: OltCredentials, portInfo: string): Promise<OnuStateEntry[]> {
    if (creds.vendor !== 'zte') return [];
    const port = normalizePonPort(portInfo, false);
    let out = '';
    try {
        // Some C600 firmware only accepts `show gpon onu state` (no port arg),
        // showing all ports in one table — filter rows by port prefix below.
        out = await executeOltCommand(creds, `show gpon onu state`);
    } catch (e) {
        return [];
    }
    const portPrefix = port.replace(/^gpon[-_]olt[-_]/i, '').replace(/\//g, '\\/');
    const re = new RegExp(`^${portPrefix}:(\\d+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)`);
    const entries: OnuStateEntry[] = [];
    for (const line of out.split('\n')) {
        const m = line.trim().match(re);
        if (m) {
            entries.push({ onuId: m[1], adminState: m[2].toLowerCase(), phase: m[4].toLowerCase() });
        }
    }
    return entries;
}

/** Pick the lowest free ONU id (1-128) on a PON port based on the physical OLT state. */
export function pickFreeOnuId(entries: OnuStateEntry[]): number | null {
    const used = new Set(entries.map(e => parseInt(e.onuId)).filter(n => !isNaN(n)));
    for (let id = 1; id <= 128; id++) {
        if (!used.has(id)) return id;
    }
    return null;
}

export async function rebootOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
    if (creds.vendor === 'zte') {
        const script = ZteC600.rebootOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script, { failOnError: true });
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.rebootOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script, { failOnError: true });
    }
    return '';
}

export async function deleteOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
    if (creds.vendor === 'zte') {
        const script = ZteC600.deleteOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script, { failOnError: true });
    } else if (creds.vendor === 'huawei') {
        const script = Huawei.deleteOnuCommand(params.portInfo, params.onuId);
        return await executeOltCommand(creds, script, { failOnError: true });
    }
    return '';
}

export async function enableOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
   if (creds.vendor === 'zte') {
      const script = ZteC600.enableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script, { failOnError: true });
   } else {
      const script = Huawei.enableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script, { failOnError: true });
   }
}

export async function disableOnu(creds: OltCredentials, params: { portInfo: string; onuId: string; }) {
   if (creds.vendor === 'zte') {
      const script = ZteC600.disableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script, { failOnError: true });
   } else {
      const script = Huawei.disableOnuCommand(params.portInfo, params.onuId);
      return await executeOltCommand(creds, script, { failOnError: true });
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
            
            // C600 format fallback
            if (cpu === 0 && mem === 0) {
               const mscMatch = output.match(/MSC\s+\d+%\s+(\d+)%.*?(\d+(?:\.\d+)?)%/i);
               if (mscMatch) {
                   cpu = parseInt(mscMatch[1]); // CPU(1m)
                   mem = parseInt(mscMatch[2]); // Mem%
               }
            }
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
        const stateOutput = await executeOltCommand(creds, cmds[0]).catch(() => '');
        const cardsOutput = await executeOltCommand(creds, cmds[1]).catch(() => '');
        const briefOutput = await executeOltCommand(creds, cmds[2]).catch(() => '');
        return ZteC600.parsePonPorts(stateOutput, cardsOutput, briefOutput);
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
    if (creds.vendor === 'zte') {
        const output = await executeOltCommand(creds, ZteC600.getVlansCommand());
        return ZteC600.parseVlans(output);
    }
    // Fallback if not ZTE or error
    return [];
}

export function parseOltAttenuation(output: string) {
    const lines = output.split('\n');
    let onuRx: string | null = null;
    let onuTx: string | null = null;
    let oltRx: string | null = null;
    let oltTx: string | null = null;

    for (const line of lines) {
        // C320 format
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
        
        // C600 format
        // up      Rx :-24.547(dbm)      Tx:2.372(dbm)        26.919(dB)
        // up      Rx :no signal         Tx:N/A               N/A
        if (line.trim().startsWith('up') && line.includes('Rx')) {
            const rxMatch = line.match(/Rx\s*:\s*([\-\d\.]+)/i);
            const txMatch = line.match(/Tx\s*:\s*([\-\d\.]+)/i);
            if (rxMatch) oltRx = rxMatch[1];
            else if (line.toLowerCase().includes('no signal')) oltRx = null; // ONU is truly offline
            if (txMatch) onuTx = txMatch[1];
        }
        // down    Tx :5.379(dbm)        Rx:-19.862(dbm)      25.241(dB)
        if (line.trim().startsWith('down') && line.includes('Tx')) {
            const txMatch = line.match(/Tx\s*:\s*([\-\d\.]+)/i);
            const rxMatch = line.match(/Rx\s*:\s*([\-\d\.]+)/i);
            if (txMatch) oltTx = txMatch[1];
            if (rxMatch) onuRx = rxMatch[1];
        }
    }
    
    // Helper: convert to numeric string or null
    const toSignal = (val: string | null): string => {
        if (!val || val === 'N/A' || val.toLowerCase() === 'no signal') return 'null';
        return val;
    };

    return {
        onu_rx_power: toSignal(onuRx),
        onu_tx_power: toSignal(onuTx),
        olt_rx_power: toSignal(oltRx),
        olt_tx_power: toSignal(oltTx),
        no_signal: !onuRx && !onuTx // true when ONU is physically offline
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
    const distanceMatch = output.match(/Distance:\s*(\d+)\s*m/i);
    // C600 detail-info: "Online Duration:      1029h 55m 38s"
    const uptimeMatch = output.match(/Online Duration:\s*([\d\shms]+)/i);
    return {
        distance: distanceMatch ? distanceMatch[1] + 'm' : 'N/A',
        firmware: 'N/A',
        uptime: uptimeMatch ? uptimeMatch[1].trim() : null,
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

/**
 * Detect the ONU type naming actually registered on the C600 from the OLT:
 *  - type ALL        -> UNIs are eth_1/x, wifi_1/x
 *  - ZTE-F660/HG8245H/... -> UNIs are eth_0/x, wifi_0/x
 * Returns 'ALL' for eth_1/x, 'ZTE-F660' for eth_0/x, or null when the query
 * fails (caller then falls back to its own default). The DB onu_type is often
 * empty, so this is the source of truth for UNI-based commands.
 */
export async function detectOnuType(creds: OltCredentials, onuInterface: string): Promise<string | null> {
    if (creds.vendor !== 'zte') return null;
    try {
        const output = await executeOltCommand(creds, `show gpon remote-onu interface eth ${onuInterface}`);
        if (/Interface\s*:\s*eth_1\//i.test(output)) return 'ALL';
        if (/Interface\s*:\s*eth_0\//i.test(output)) return 'ZTE-F660';
        return null;
    } catch {
        return null;
    }
}
