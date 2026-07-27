import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const onu = await prisma.oNUConfigured.findFirst({ where: { name: 'baksotarkamkemiri' } });
    console.log('DB SIGNAL FOR baksotarkamkemiri:', onu?.signal);
}
main().catch(console.error).finally(() => prisma.$disconnect());
