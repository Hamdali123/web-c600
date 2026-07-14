const { PrismaClient } = require('@prisma/client');
const { executeOltCommand } = require('/home/sanwanay/smartolt_baru/src/lib/oltConnection');
const prisma = new PrismaClient();

async function main() {
    const olt = await prisma.oLTDevice.findFirst({});
    const creds = { ip: olt.ip_address, port: olt.telnet_port || 23, username: olt.telnet_user || '', password: olt.telnet_pass || '' };
    
    try {
        const out = await executeOltCommand(creds, 'show gpon onu uncfg');
        console.log("UNCFG RAW:");
        console.log(out);
    } catch(e) { console.error(e); }
}
main().catch(console.error).finally(() => prisma.$disconnect());
