const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaign = await prisma.campaign.findFirst();
  const user = await prisma.user.findFirst();
  
  if (!campaign || !user) {
    console.error('Missing campaign or user for test');
    return;
  }

  console.log('Testing cemetery creation...');
  const cem = await prisma.cemetery.create({
    data: {
      id: 'TEST-CEM-' + Date.now(),
      name: 'Test Cemetery',
      campaignId: campaign.id,
      addedBy: user.id
    }
  });
  console.log('Test successful:', cem.id);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
