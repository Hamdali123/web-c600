const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const onu = await prisma.oNUConfigured.findFirst({
    where: { pon_port: 'gpon-olt_1/2/13', onu_id: '49' }
  });
  console.log("ONU 1/2/13:49 =", onu);
}

main().catch(console.error).finally(() => prisma.$disconnect());
