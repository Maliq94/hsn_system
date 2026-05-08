
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Inserting general visit...');
  const visit = await prisma.visit.create({
    data: {
      userId: 'admin-1',
      lat: 32.88,
      lng: 13.17,
      notes: 'Test general visit'
    }
  });
  console.log('SUCCESS:', visit);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
