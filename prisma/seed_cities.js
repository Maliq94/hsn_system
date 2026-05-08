const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const LIBYAN_CITIES = [
    "طرابلس", "بنغازي", "مصراتة", "الزاوية", "سبها", 
    "طبرق", "درنة", "سرت", "البيضاء", "صبراتة", 
    "غريان", "ترهونة", "زواره", "زليتن"
  ];

  console.log('Seeding cities...');
  
  for (const name of LIBYAN_CITIES) {
    await prisma.city.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  
  console.log('Finished seeding cities.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
