import { PrismaClient } from '@prisma/client';
import { executeOltCommand } from '../src/lib/oltConnection';

const prisma = new PrismaClient();

async function main() {
  const olt = await prisma.oLTDevice.findFirst({});
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
    vendor: (olt.vendor?.toLowerCase() === 'huawei' ? 'huawei' : 'zte') as 'zte' | 'huawei',
    protocol: (olt.protocol === 'ssh' ? 'ssh' : 'telnet') as 'telnet' | 'ssh'
  };

  try {
    const output = await executeOltCommand(creds, 'show gpon onu state');
    const lines = output.split('\n');
    let limit = 0;
    for(const line of lines) {
      if (line.toLowerCase().includes('los') || line.toLowerCase().includes('gasp') || line.toLowerCase().includes('fail')) {
        console.log("FOUND OFFLINE REASON:", line);
      }
    }
    console.log("--- First 15 lines of output ---");
    for(let i = 0; i < 15; i++) {
        if(lines[i]) console.log(lines[i]);
    }
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
