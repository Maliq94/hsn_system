const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { phone: 'admin' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: 'ADMIN-ROOT',
        name: 'Super Admin',
        phone: 'admin',
        password: 'admin',
        role: 'ADMIN'
      }
    });
    console.log('Admin user created: admin / admin');
  } else {
    console.log('User "admin" already exists.');
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
