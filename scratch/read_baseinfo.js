const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/home/sanwanay/smartolt_baru/scratch/baseinfo.json', 'utf8'));
console.log(data.output.slice(0, 20).join('\n'));
