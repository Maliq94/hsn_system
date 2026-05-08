
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring admin-1 user exists...');
  const user = await prisma.user.upsert({
    where: { id: 'admin-1' },
    update: {},
    create: {
      id: 'admin-1',
      name: 'Admin',
      phone: 'admin',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  console.log('User OK:', user.id);

  console.log('Inserting general visit...');
  const visit = await prisma.visit.create({
    data: {
      userId: 'admin-1',
      lat: 32.88,
      lng: 13.17,
      notes: 'Final validation check-in'
    }
  });
  console.log('SUCCESS:', visit);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
