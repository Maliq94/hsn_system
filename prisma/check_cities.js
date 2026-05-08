const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function check() {
  const count = await prisma.city.count();
  const cities = await prisma.city.findMany();
  console.log('COUNT:', count);
  console.log('CITIES:', JSON.stringify(cities));
}

check().catch(console.error).finally(() => prisma.$disconnect());
