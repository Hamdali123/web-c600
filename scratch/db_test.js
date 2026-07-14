const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const filter = {};
  try {
    const pwrFailCount = await prisma.oNUConfigured.count({
      where: {
        ...filter,
        OR: [
          { offline_reason: { contains: 'power', mode: 'insensitive' } },
          { offline_reason: { contains: 'dying', mode: 'insensitive' } }
        ]
      }
    });
    console.log("pwrFailCount:", pwrFailCount);
  } catch (e) {
    console.error("Error pwrFailCount:", e.message);
  }

  try {
    const signalWarningCount = await prisma.oNUConfigured.count({
      where: {
        ...filter,
        status: 'Online',
        signal: { lte: -25, gt: -28 }
      }
    });
    console.log("signalWarningCount:", signalWarningCount);
  } catch (e) {
    console.error("Error signalWarningCount:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
