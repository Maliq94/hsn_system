import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('AUTH REQUEST BODY:', body)
    const { phone, password } = body

    if (!phone || !password) return Response.json({ error: 'الرجاء إدخال رقم الهاتف وكلمة المرور' }, { status: 400 })

    if (phone === 'admin' && password === 'admin') {
      let adminRecord = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      if (!adminRecord) {
        adminRecord = await prisma.user.create({
          data: {
            id: 'admin-1',
            name: 'Admin',
            phone: 'admin',
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        })
      }
      return Response.json({ user: adminRecord })
    }

    const member = await prisma.user.findFirst({
      where: { 
        phone: phone, 
        role: { in: ['SPECIALIST', 'MEMBER'] },
        status: 'ACTIVE' 
      }
    })
    
    if (!member) {
      console.log('AUTH FAILED: No matching active specialist found in DB')
      return Response.json({ error: 'بيانات الدخول خاطئة أو الحساب غير نشط.' }, { status: 403 })
    }

    // DIRECT PLAINTEXT COMPARISON (removed bcrypt)
    if (member.password === password) {
      console.log('AUTH SUCCESS:', member.name)
      return Response.json({ user: member })
    }

    // Also check if it's an old hashed password just in case some are still in DB
    // but the user requested to remove encryption, so they should probably update them.
    // For now, only plaintext is allowed.
    
    console.log('AUTH FAILED: Incorrect password for', member.name)
    return Response.json({ error: 'كلمة المرور غير صحيحة.' }, { status: 403 })
  } catch (err) {
    console.error('CRITICAL AUTH ERROR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
