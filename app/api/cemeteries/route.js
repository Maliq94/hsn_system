import { prisma } from '@/lib/prisma'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    
    const where = campaignId ? { campaignId } : {}
    const cemeteries = await prisma.cemetery.findMany({
      where,
      include: { user: true, campaign: true },
      orderBy: { createdAt: 'desc' }
    })
    return Response.json(cemeteries)
  } catch (err) {
    console.error('FETCH CEMETERIES ERR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('CREATE CEMETERY REQUEST:', body)
    const { name, campaignId, lat, lng, notes, images, voiceData, addedBy } = body

    if (!name || !campaignId || !addedBy) {
      console.error('CREATE CEMETERY ERR: Missing required fields');
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
 
    const cemetery = await prisma.cemetery.create({
      data: {
        id: 'CEM-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        name,
        campaignId,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        notes,
        images,
        voiceData,
        addedBy,
        status: 'PENDING'
      },
      include: { user: true, campaign: true }
    })
    console.log('CEMETERY CREATED SUCCESSFULLY:', cemetery.id)
    return Response.json(cemetery)
  } catch (err) {
    console.error('CREATE CEMETERY CRITICAL ERR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
 
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, lat, lng, notes, images, voiceData, status } = body
 
    const updated = await prisma.cemetery.update({
      where: { id },
      data: {
        ...(lat !== undefined ? { lat: parseFloat(lat) } : {}),
        ...(lng !== undefined ? { lng: parseFloat(lng) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(images !== undefined ? { images } : {}),
        ...(voiceData !== undefined ? { voiceData } : {}),
        ...(status !== undefined ? { status } : {})
      },
      include: { user: true, campaign: true }
    })
    return Response.json(updated)
  } catch (err) {
    console.error('UPDATE CEMETERY ERR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
