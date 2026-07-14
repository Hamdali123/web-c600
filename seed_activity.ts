import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.create({
    data: {
      action: 'System started successfully',
      details: 'SmartOLT clone background worker initialized.',
      createdAt: new Date()
    }
  });
  console.log('Seeded ActivityLog');
}

main().catch(console.error).finally(() => prisma.$disconnect());
