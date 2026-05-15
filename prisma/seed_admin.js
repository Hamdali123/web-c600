
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({
    where: { email: 'mohamadsanwani9@gmail.com' }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: 'mohamadsanwani9@gmail.com',
        password: '72UubSHF4m2z'
      }
    });
    console.log('Admin user updated.');
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: 'Administrator',
      email: 'mohamadsanwani9@gmail.com',
      password: '72UubSHF4m2z', 
      role: 'admin',
      status: 'Active'
    }
  });

  console.log('Admin user created successfully:', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
