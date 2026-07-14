const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const onus = await prisma.oNUConfigured.findMany({ take: 5 });
  console.log(onus.map(o => ({ id: o.id, sn_mac: o.sn_mac, name: o.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
