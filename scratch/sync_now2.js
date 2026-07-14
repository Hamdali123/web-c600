const { PrismaClient } = require('@prisma/client');
const { executeOltCommand } = require('/home/sanwanay/smartolt_baru/src/lib/oltConnection');
const prisma = new PrismaClient();

async function main() {
  const olt = await prisma.oLTDevice.findFirst({});
  const creds = {
    ip: olt.ip_address, host: olt.ip_address, port: olt.telnet_port || 23,
    username: olt.telnet_user || '', password: olt.telnet_pass || '',
    vendor: (olt.vendor?.toLowerCase() === 'huawei' ? 'huawei' : 'zte'),
    protocol: (olt.protocol === 'ssh' ? 'ssh' : 'telnet')
  };

  const stateOutput = await executeOltCommand(creds, 'show gpon onu state');
  const stateLines = stateOutput.split('\n');
  const configuredOnus = await prisma.oNUConfigured.findMany();
  
  let onlineCount = 0;
  let offlineCount = 0;
  let skipped = 0;

  for (const onu of configuredOnus) {
    const portNumber = (onu.pon_port || '').replace('gpon-olt_', '');
    const targetIndex = `${portNumber}:${onu.onu_id}`;

    let state = null;
    for (const line of stateLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(targetIndex + ' ') || trimmed.startsWith(targetIndex + '\t')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 6) {
          state = parts[5].toLowerCase();
        } else if (parts.length >= 4) {
          state = parts[3].toLowerCase();
        }
        break;
      }
    }

    if (!state) {
        skipped++;
        continue;
    }

    const status = state === 'working' ? 'Online' : 'Offline';
    const reason = state !== 'working' ? state : null;

    if (status === 'Online') onlineCount++;
    else offlineCount++;

    await prisma.oNUConfigured.update({
      where: { id: onu.id },
      data: {
        status: status,
        offline_reason: reason === 'working' ? null : reason
      }
    });
  }
  console.log(`Finished! Status updated: ${onlineCount} Online, ${offlineCount} Offline. Skipped: ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
