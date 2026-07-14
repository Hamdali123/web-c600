const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const onus = await prisma.oNUConfigured.findMany({
    where: { status: 'Offline' }
  });
  const reasons = {};
  for(const o of onus) {
    reasons[o.offline_reason] = (reasons[o.offline_reason] || 0) + 1;
  }
  console.log("Offline reasons:", reasons);
}

main().catch(console.error).finally(() => prisma.$disconnect());
