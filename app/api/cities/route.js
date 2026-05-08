import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' }
    });
    return Response.json(cities);
  } catch (err) {
    console.error('CITIES GET ERR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const { id, name } = await req.json();
  
  if (id) {
    const city = await prisma.city.update({
      where: { id },
      data: { name }
    });
    return Response.json(city);
  } else {
    const city = await prisma.city.create({
      data: { name }
    });
    return Response.json(city);
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 });

  await prisma.city.delete({ where: { id } });
  return Response.json({ success: true });
}
