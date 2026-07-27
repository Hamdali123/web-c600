import { PrismaClient } from '@prisma/client';
import { executeOltCommand, OltCredentials } from './src/lib/oltConnection';

const prisma = new PrismaClient();

async function main() {
    const olt = await prisma.oLTDevice.findFirst({ where: { id: 5 } });
    if (!olt) return;

    const creds: OltCredentials = {
        ip: olt.ip_address,
        port: olt.telnet_port || 23,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as any) || 'telnet',
        vendor: (olt.vendor as any) || 'zte'
    };

    console.log('Connecting to OLT...');
    
    const cmds = [
        'show pon power attenuation gpon_onu-1/2/13:65',
        'show pon power attenuation gpon_onu-1/2/9:20'
    ];
    
    for (const cmd of cmds) {
        console.log(`\nExecuting: ${cmd}`);
        try {
            const out = await executeOltCommand(creds, cmd);
            console.log('RAW OUTPUT:');
            console.log(out);
        } catch (e) {
            console.error('Error executing cmd:', e);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
