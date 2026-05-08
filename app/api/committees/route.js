import { PrismaClient } from '@prisma/client'

const globalForPrisma = global
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function GET() {
  try {
    const committees = await prisma.committee.findMany({
      orderBy: { name: 'asc' }
    });
    return Response.json(committees);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { id, name } = await request.json();
    if (id) {
      const updated = await prisma.committee.update({ where: { id }, data: { name } });
      return Response.json(updated);
    }
    const created = await prisma.committee.create({ data: { name } });
    return Response.json(created);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await prisma.committee.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
