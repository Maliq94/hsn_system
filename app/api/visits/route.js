import { prisma } from '@/lib/prisma'

const mapVisit = (v) => ({
  ...v,
  case: v.Renamedcase,
  cemetery: v.cemetery
});

export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      include: { user: true, Renamedcase: true, cemetery: true },
      orderBy: { timestamp: 'desc' }
    });
    return Response.json(visits.map(mapVisit));
  } catch (err) {
    console.error('FETCH VISITS ERR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, caseId, cemeteryId, lat, lng, notes, images, videos, voiceData } = body;
    
    if (!userId) return Response.json({ error: "userId is required." }, { status: 400 })

    const visit = await prisma.visit.create({
      data: {
        id: 'VISIT-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        userId,
        caseId: caseId || null,
        cemeteryId: cemeteryId || null,
        lat: lat ? parseFloat(lat) : 0,
        lng: lng ? parseFloat(lng) : 0,
        notes,
        images: Array.isArray(images) ? JSON.stringify(images) : (typeof images === 'string' ? images : null),
        videos: Array.isArray(videos) ? JSON.stringify(videos) : (typeof videos === 'string' ? videos : null),
        voiceData
      },
      include: { user: true, Renamedcase: true, cemetery: true }
    });

    // Late-Binding GPS Snap for Cases
    if (caseId) {
      const targetCase = await prisma.renamedcase.findUnique({ where: { id: caseId } });
      if (targetCase && targetCase.lat === null && (lat !== undefined && lng !== undefined)) {
        await prisma.renamedcase.update({
          where: { id: caseId },
          data: { lat: parseFloat(lat), lng: parseFloat(lng) }
        });
      }
    }

    // Late-Binding GPS Snap for Cemeteries
    if (cemeteryId) {
      const targetCem = await prisma.cemetery.findUnique({ where: { id: cemeteryId } });
      if (targetCem && targetCem.lat === null && (lat !== undefined && lng !== undefined)) {
        await prisma.cemetery.update({
          where: { id: cemeteryId },
          data: { lat: parseFloat(lat), lng: parseFloat(lng) }
        });
      }
    }

    return Response.json(mapVisit(visit));
  } catch (err) {
    console.error('SAVE VISIT ERR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
