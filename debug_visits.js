
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const visit = await prisma.visit.findFirst({
    orderBy: { timestamp: 'desc' }
  });
  console.log('--- LATEST VISIT ---');
  if (visit) {
    console.log('ID:', visit.id);
    console.log('UserId:', visit.userId);
    console.log('CaseId:', visit.caseId);
    console.log('Has Images:', visit.images ? 'YES' : 'NO');
    if (visit.images) {
        console.log('Images Length:', visit.images.length);
        console.log('Images Start:', visit.images.substring(0, 100));
    }
  } else {
    console.log('No visits found.');
  }
  console.log('--------------------');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
