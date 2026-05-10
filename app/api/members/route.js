import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const members = await prisma.user.findMany({
      where: { role: { in: ['SPECIALIST', 'MEMBER', 'COMMITTEE_HEAD'] } },
      orderBy: { createdAt: 'desc' }
    })
    return Response.json(members)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, name, phone, password, whatsapp, photo, committee, status, role } = body
    
    if (id) {
      const data = { name, phone, whatsapp, photo, committee, status }
      if (role) data.role = role
      if (password) {
        data.password = password // Plaintext
      }
      
      const member = await prisma.user.update({
        where: { id },
        data
      })
      return Response.json(member)
    } else {
      // Create new
      const member = await prisma.user.create({
        data: {
          id: 'MEM-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          role: role || 'MEMBER',
          name, phone, password: password || '123456', whatsapp, photo, committee, status: status || 'ACTIVE'
        }
      })
      return Response.json(member)
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    await prisma.user.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
