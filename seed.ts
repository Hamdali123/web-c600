import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'mohamadsanwani9@gmail.com' },
    update: { password: '72UubSHF4m2z', role: 'admin', status: 'Active' },
    create: { name: 'Admin', email: 'mohamadsanwani9@gmail.com', password: '72UubSHF4m2z', role: 'admin', status: 'Active' }
  });
  console.log('User created or updated successfully');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
