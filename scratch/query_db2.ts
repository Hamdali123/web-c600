import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const onus = await prisma.oNUConfigured.findMany({ take: 5 });
  console.log(onus);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
