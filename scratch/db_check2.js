const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const onus = await prisma.oNUConfigured.findMany({
    select: { sn_mac: true, status: true, offline_reason: true, signal: true }
  });
  console.log("Total ONUs:", onus.length);
  
  const offlineReasons = {};
  const statuses = {};
  
  for(let onu of onus) {
    statuses[onu.status] = (statuses[onu.status] || 0) + 1;
    if (onu.offline_reason) {
       offlineReasons[onu.offline_reason] = (offlineReasons[onu.offline_reason] || 0) + 1;
    }
  }
  console.log("Statuses:", statuses);
  console.log("Offline Reasons:", offlineReasons);
}

main().catch(console.error).finally(() => prisma.$disconnect());
