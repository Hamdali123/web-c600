const { PrismaClient } = require('@prisma/client');
const { executeOltCommandBatch, executeOltCommand } = require('./src/lib/oltConnection');

async function debugReboot() {
  const prisma = new PrismaClient();
  const onu = await prisma.oNUConfigured.findUnique({
      where: { sn_mac: 'ZTEGCF163738' }, // From user's screenshot
      include: { olt: true }
  });
  await prisma.$disconnect();

  if (!onu) {
      console.log("ONU not found in DB");
      return;
  }

  const creds = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol || 'telnet').toLowerCase(),
      vendor: (onu.olt.manufacturer || 'zte').toLowerCase()
  };

  try {
      console.log("Sending commands...");
      // Trying the standard reboot command and getting output
      const cmd = `
configure terminal
pon-onu-mng gpon_onu-1/13:2
reboot
`;
      const out = await executeOltCommandBatch(creds, cmd.trim().split('\n'));
      console.log("Output from OLT:");
      console.log(out);
  } catch (e) {
      console.error("Error:", e);
  }
}

debugReboot();
