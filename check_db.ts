import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const onuTypes = await prisma.oNUType.count();
  const speedProfiles = await prisma.speedProfile.count();
  console.log(`ONU Types in DB: ${onuTypes}`);
  console.log(`Speed Profiles in DB: ${speedProfiles}`);
}

run().finally(() => prisma.$disconnect());
