const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const onus = await prisma.oNUConfigured.findMany({
    where: { status: 'Online', signal: null }
  });
  console.log("Online with null signal:", onus.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
