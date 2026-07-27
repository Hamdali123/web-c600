import { PrismaClient } from '@prisma/client';
const { executeOltCommand } = require('./src/lib/oltConnection');

const prisma = new PrismaClient();

async function main() {
  const olts = await prisma.oLTDevice.findMany();
  const olt = olts[0];
  const creds = {
    ip: olt.ip_address,
    port: olt.telnet_port || 23,
    username: olt.telnet_user || '',
    password: olt.telnet_pass || '',
    protocol: (olt.protocol as any) || 'telnet',
    vendor: (olt.vendor as any) || 'zte'
  };

  console.log("Fetching running config for an ONU to see if name/description exists...");
  // Let's get the config for 1/2/1:1 or 1/2/11:10 (the one we saw in screenshot)
  const cfg = await executeOltCommand(creds, 'show running-config interface gpon_onu-1/2/11:10');
  console.log("Config for 1/2/11:10:", cfg);
  
  const detail = await executeOltCommand(creds, 'show gpon onu detail-info gpon_onu-1/2/11:10');
  console.log("Detail for 1/2/11:10:", detail);
}

main().finally(() => prisma.$disconnect());
