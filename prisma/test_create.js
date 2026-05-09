const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing City Creation...')
    const city = await prisma.city.create({
      data: { name: 'Test City ' + Math.random().toString(36).substr(2, 5) }
    })
    console.log('Success:', city)
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
