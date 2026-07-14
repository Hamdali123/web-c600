import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.oNUConfigured.updateMany({
    data: {
      mode: 'route',
      vlan: '125', // Assuming 125 is their default internet VLAN
    }
  });
  console.log("Reverted ONUs to route mode.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
