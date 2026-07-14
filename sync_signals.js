const { PrismaClient } = require('@prisma/client');
const { Telnet } = require('telnet-client');
const prisma = new PrismaClient();

async function main() {
  const olts = await prisma.oLTDevice.findMany();
  if (olts.length === 0) return;
  const olt = olts[0];

  const connection = new Telnet();
  const params = {
    host: olt.ip_address,
    port: olt.telnet_port || 23,
    shellPrompt: />|#/,
    timeout: 10000,
    loginPrompt: /Username:/i,
    passwordPrompt: /Password:/i,
    username: olt.telnet_user,
    password: olt.telnet_pass
  };

  try {
    await connection.connect(params);
    await connection.send('terminal length 0');

    // Get all distinct PON ports
    const onus = await prisma.oNUConfigured.findMany({ where: { status: 'Online' } });
    const ponPorts = [...new Set(onus.map(o => o.pon_port).filter(Boolean))];

    for (const port of ponPorts) {
      // port is "gpon-olt_1/2/1", OLT expects "gpon_olt-1/2/1"
      const cliPort = port.replace('gpon-olt_', 'gpon_olt-');
      console.log("Fetching signals for CLI PON port:", cliPort);
      const output = await connection.send(`show pon power onu-rx ${cliPort}`).catch(e=>e);
      
      if (typeof output !== 'string') continue;

      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/(gpon_onu-\d+\/\d+\/\d+):(\d+)\s+([-]?\d+\.\d+)\(dbm\)/i);
        if (match) {
          const pon = match[1].replace('gpon_onu-', 'gpon-olt_');
          const onu_id = match[2];
          const signal = parseFloat(match[3]);
          
          await prisma.oNUConfigured.updateMany({
            where: { pon_port: pon, onu_id: onu_id },
            data: { signal: signal }
          });
        }
      }
    }

    await connection.destroy();
    console.log("Done syncing signals.");
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
