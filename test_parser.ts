const output = `show pon power attenuation gpon_onu-1/2/11:10
           OLT                  ONU              Attenuation
--------------------------------------------------------------------------
 up      Rx :-8.72(dbm)       Tx:2.363(dbm)        11.282(dB)     
 
 down    Tx :6.629(dbm)        Rx:-5.288(dbm)       11.917(dB)`;

const lines = output.split('\n');
let onuRx = '-40.0';
let oltRx = '-40.0';

for (const line of lines) {
    if (line.trim().startsWith('up') && line.includes('Rx')) {
        const rxMatch = line.match(/Rx\s*:\s*([\-\d\.]+)/i);
        if (rxMatch) oltRx = rxMatch[1];
    }
    if (line.trim().startsWith('down') && line.includes('Tx')) {
        const rxMatch = line.match(/Rx\s*:\s*([\-\d\.]+)/i);
        if (rxMatch) onuRx = rxMatch[1];
    }
}
console.log({ onuRx, oltRx });
