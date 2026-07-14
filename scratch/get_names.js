const { executeOltCommand } = require('/home/sanwanay/smartolt_baru/src/lib/oltConnection');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const olt = await prisma.oLTDevice.findFirst({});
  const creds = {
    ip: olt.ip_address, host: olt.ip_address, port: olt.telnet_port || 23,
    username: olt.telnet_user || '', password: olt.telnet_pass || '',
    vendor: 'zte', protocol: 'telnet'
  };
  
  const cmd = await executeOltCommand(creds, 'show gpon onu detail-info gpon_onu-1/2/1:1');
  console.log(cmd);
}

main().catch(console.error).finally(() => prisma.$disconnect());
