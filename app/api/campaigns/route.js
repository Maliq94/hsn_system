import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        members: { include: { user: true } },
        cemeteries: { include: { user: true, visits: { include: { user: true } } } },
        cases: { include: { caseassignment: { include: { user: true } }, visit: { include: { user: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return Response.json(campaigns)
  } catch (err) {
    console.error('FETCH CAMPAIGNS ERR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, name, city, description, status, visibility, memberIds, isDefault } = body

    // HANDLE DEFAULT EXCLUSIVITY
    if (isDefault === true) {
      await prisma.campaign.updateMany({
        where: { NOT: { id: id || undefined } },
        data: { isDefault: false }
      })
    }

    // UPDATE EXISTING
    if (id) {
      // Remove old members, re-add
      await prisma.campaignmember.deleteMany({ where: { campaignId: id } })
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          name, city, description,
          status: status || 'ACTIVE',
          visibility: visibility || 'PRIVATE',
          isDefault: isDefault === true,
          members: {
            create: (memberIds || []).map(uid => ({
              id: 'CM-' + Math.random().toString(36).substr(2, 8),
              userId: uid
            }))
          }
        },
        include: {
          members: { include: { user: true } },
          cemeteries: { include: { user: true } },
          cases: { include: { caseassignment: { include: { user: true } }, visit: true } }
        }
      })
      return Response.json(updated)
    }

    // CREATE NEW
    const campaign = await prisma.campaign.create({
      data: {
        id: 'CAMP-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        name, city, description,
        status: 'ACTIVE',
        visibility: visibility || 'PRIVATE',
        isDefault: isDefault === true,
        members: {
          create: (memberIds || []).map(uid => ({
            id: 'CM-' + Math.random().toString(36).substr(2, 8),
            userId: uid
          }))
        }
      },
      include: {
        members: { include: { user: true } },
        cemeteries: { include: { user: true, visits: { include: { user: true } } } },
        cases: { include: { caseassignment: { include: { user: true } }, visit: { include: { user: true } } } }
      }
    })
    return Response.json(campaign)
  } catch (err) {
    console.error('SAVE CAMPAIGN ERR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.campaign.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
