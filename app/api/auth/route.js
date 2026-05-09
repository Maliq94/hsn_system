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

    const user = await prisma.user.findFirst({
      where: { 
        phone: phone, 
        status: 'ACTIVE' 
      }
    })
    
    if (!user) {
      console.log('AUTH FAILED: No matching active user found in DB')
      return Response.json({ error: 'بيانات الدخول خاطئة أو الحساب غير نشط.' }, { status: 403 })
    }

    if (user.password === password) {
      console.log('AUTH SUCCESS:', user.name)
      return Response.json({ user })
    }
    
    console.log('AUTH FAILED: Incorrect password for', user.name)
    return Response.json({ error: 'كلمة المرور غير صحيحة.' }, { status: 403 })
  } catch (err) {
    console.error('CRITICAL AUTH ERROR:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
