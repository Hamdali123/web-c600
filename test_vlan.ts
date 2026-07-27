import { executeOltCommand } from './src/lib/oltConnection';
import * as ZteC600 from './src/lib/vendors/zte-c600';

const creds = { ip: '103.68.214.225', port: 2334, username: 'sanwanay', password: '1Sampai9', protocol: 'telnet', vendor: 'zte' } as any;

async function run() {
    try {
        console.log('Sending show vlan...');
        const out = await executeOltCommand(creds, 'show vlan');
        console.log('--- OUTPUT ---');
        console.log(out);
        console.log('--- PARSED ---');
        console.log(ZteC600.parseVlans(out));
    } catch(e) {
        console.error(e);
    }
}
run();
