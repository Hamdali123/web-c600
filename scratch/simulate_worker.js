const fs = require('fs');
const stateOutput = fs.readFileSync('/home/sanwanay/smartolt_baru/scratch/olt_out.json', 'utf8');

// The output from the test API route is a JSON array of strings
const stateLines = JSON.parse(stateOutput).output;

const onu = { pon_port: 'gpon-olt_1/2/13', onu_id: '49' };
const portNumber = (onu.pon_port || '').replace('gpon-olt_', '');
const targetIndex = `${portNumber}:${onu.onu_id}`;

console.log("Target index:", targetIndex);

let state = 'offline';
for (const line of stateLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(targetIndex + ' ') || trimmed.startsWith(targetIndex + '\t')) {
        console.log("MATCHED LINE:", trimmed);
        const parts = trimmed.split(/\s+/);
        console.log("PARTS:", parts);
        if (parts.length >= 6) {
            state = parts[5].toLowerCase();
        } else if (parts.length >= 4) {
            state = parts[3].toLowerCase();
        }
        break;
    }
}

console.log("FINAL STATE:", state);
