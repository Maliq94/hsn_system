
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.caseAssignment.findMany({
    include: {
      case: true,
      user: true
    }
  });
  console.log('--- CASE ASSIGNMENTS ---');
  console.log(JSON.stringify(assignments, null, 2));
  console.log('-------------------------');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
