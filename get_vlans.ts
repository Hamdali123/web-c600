import { executeOltCommand } from './src/lib/oltConnection.ts';

async function main() {
  const creds = {
    ip: '103.68.214.225',
    port: 2334,
    username: 'sanwanay',
    password: '1Sampai9',
    protocol: 'telnet' as const,
    vendor: 'zte' as const
  };

  try {
    const result = await executeOltCommand(creds, 'show vlan summary');
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}

main();
