const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        name: true,
        phone: true,
        role: true
      }
    });
    console.log('--- USERS REGISTRY ---');
    users.forEach(u => {
      console.log(`[${u.role}] ${u.name} | Phone: ${u.phone}`);
    });
    console.log('--- END ---');
  } catch (err) {
    console.error('DATABASE ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
