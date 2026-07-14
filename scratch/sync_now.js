const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const stateLines = JSON.parse(fs.readFileSync('/home/sanwanay/smartolt_baru/scratch/olt_out2.json', 'utf8')).output;
  const configuredOnus = await prisma.oNUConfigured.findMany();
  
  let onlineCount = 0;
  let offlineCount = 0;

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

    if (!state) continue;

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
  console.log(`Finished! Status updated: ${onlineCount} Online, ${offlineCount} Offline.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
