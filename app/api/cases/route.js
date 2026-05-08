import { prisma } from '@/lib/prisma'

const mapCase = (c) => ({
  ...c,
  assignments: c.caseassignment,
  visits: c.visit
});

export async function GET() {
  try {
    const cases = await prisma.renamedcase.findMany({
      include: {
        caseassignment: { include: { user: true } },
        visit: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return Response.json(cases.map(mapCase));
  } catch (err) {
    console.error('FETCH CASES ERR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, title, type, description, lat, lng, city, assignedUserIds, status, campaignId } = body;

    // UPDATE EXISTING
    if (id) {
      await prisma.caseassignment.deleteMany({ where: { caseId: id } });
      const updatedCase = await prisma.renamedcase.update({
        where: { id },
        data: {
          title, type, description, 
          city, campaignId,
          status: status || 'OPEN',
          ...(lat !== null && lat !== undefined ? { lat: parseFloat(lat) } : {}),
          ...(lng !== null && lng !== undefined ? { lng: parseFloat(lng) } : {}),
          caseassignment: {
            create: (assignedUserIds || []).map(uid => ({ id: Math.random().toString(36).substr(2, 9), userId: uid }))
          }
        },
        include: { caseassignment: { include: { user: true } }, visit: { include: { user: true } } }
      });
      return Response.json(mapCase(updatedCase));
    }

    // CREATE NEW
    const newCase = await prisma.renamedcase.create({
      data: {
        id: 'CASE-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        title, type, description, city, campaignId,
        lat: lat ? parseFloat(lat) : null, 
        lng: lng ? parseFloat(lng) : null, 
        status: 'OPEN',
        caseassignment: {
          create: (assignedUserIds || []).map(uid => ({ id: Math.random().toString(36).substr(2, 9), userId: uid }))
        }
      },
      include: { caseassignment: { include: { user: true } }, visit: { include: { user: true } } }
    });

    return Response.json(mapCase(newCase));
  } catch (err) {
    console.error('SAVE CASE ERR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.renamedcase.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
