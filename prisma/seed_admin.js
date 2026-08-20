const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('crypto');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function main() {
  const email = 'mohamadsanwani9@gmail.com';
  const password = '72UubSHF4m2z';

  const existing = await prisma.user.findFirst({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        username: existing.username || 'admin',
        password: existing.password.startsWith('scrypt$') ? existing.password : hashPassword(password)
      }
    });
    console.log('Admin user updated (password hashed).');
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: 'Administrator',
      username: 'admin',
      email,
      password: hashPassword(password),
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