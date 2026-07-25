const { executeOltCommand } = require('./src/lib/oltConnection');

async function test() {
  const creds = { ip: '103.68.214.225', port: 2334, username: 'sanwanay', password: '1Sampai9', protocol: 'telnet', vendor: 'zte' };
  try {
    const output = await executeOltCommand(creds, 'show pon onu uncfg');
    console.log("OUTPUT:");
    console.log(output);
  } catch (e) { console.error(e); }
  process.exit(0);
}
test();
