const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { executeOltCommand } = require('./src/lib/oltConnection');

async function main() {
  const olt = await prisma.oLTDevice.findFirst({ where: { active: true } });
  if (!olt) {
    console.log("No active OLT found");
    return;
  }
  
  const creds = {
    host: olt.ip_address,
    port: olt.telnet_port || 23,
    username: olt.telnet_user,
    password: olt.telnet_pass,
    vendor: olt.vendor.toLowerCase()
  };

  try {
    const output = await executeOltCommand(creds, 'show gpon onu state');
    console.log("--- OUTPUT ---");
    console.log(output.substring(0, 1000));
    console.log("--- END ---");
  } catch(e) {
    console.error("Error:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
