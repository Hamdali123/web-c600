import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'mohamadsanwani9@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.user.create({
      data: {
        name: 'Mohamad Sanwani',
        email: email,
        password: '72UubSHF4m2z', // plain text just to match their exact request if hash isn't used
        role: 'admin',
        status: 'Active'
      }
    });
    console.log("User created!");
  } else {
    console.log("User already exists!");
  }
}
main();
