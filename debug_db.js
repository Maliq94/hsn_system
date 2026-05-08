
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));
  console.log('-------------------');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
