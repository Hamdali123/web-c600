const fs = require('fs');
const stateLines = JSON.parse(fs.readFileSync('/home/sanwanay/smartolt_baru/scratch/olt_out.json', 'utf8')).output;
let counts = {};
for(const line of stateLines) {
  if (line.includes('enable') || line.includes('disable')) {
      const parts = line.trim().split(/\s+/);
      const state = parts.length >= 4 ? parts[3].toLowerCase() : 'unknown';
      counts[state] = (counts[state] || 0) + 1;
  }
}
console.log(counts);
