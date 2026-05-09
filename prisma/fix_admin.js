const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current Users:', JSON.stringify(users, null, 2));
  
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('No Admin found. Creating default admin...');
    const newAdmin = await prisma.user.create({
      data: {
        id: 'ADMIN-001',
        name: 'Admin',
        phone: 'admin',
        password: 'admin',
        role: 'ADMIN'
      }
    });
    console.log('Admin Created:', newAdmin);
  } else {
    console.log('Admin exists:', admin.phone, '/', admin.password);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
