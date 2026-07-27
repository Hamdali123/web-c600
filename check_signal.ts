import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const onus = await prisma.oNUConfigured.findMany({
        where: { mode: 'route' },
        select: { id: true, name: true, mode: true, signal: true, sn_mac: true }
    });
    console.log(onus);
}

main().catch(console.error).finally(() => prisma.$disconnect());
