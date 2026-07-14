import { PrismaClient } from '@prisma/client';
import { executeOltCommand } from '../src/lib/oltConnection';

const prisma = new PrismaClient();

async function main() {
  const olt = await prisma.oLTDevice.findFirst({ where: { } });
  if (!olt) {
    console.log("No active OLT found");
    return;
  }
  
  const creds = {
    ip: olt.ip_address,
    host: olt.ip_address,
    port: olt.telnet_port || 23,
    username: olt.telnet_user || '',
    password: olt.telnet_pass || '',
    vendor: olt.vendor?.toLowerCase() || 'zte',
    protocol: (olt.protocol === 'ssh' ? 'ssh' : 'telnet') as 'telnet' | 'ssh'
  };

  try {
    const output = await executeOltCommand(creds, 'show gpon onu state');
    console.log("--- OUTPUT ---");
    console.log(output.substring(0, 2000));
    console.log("--- END ---");
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
