const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOlt() {
  const olts = await prisma.oLTDevice.findMany();
  console.log(JSON.stringify(olts, null, 2));
}

checkOlt().catch(console.error).finally(() => prisma.$disconnect());
