import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const totalCases = await prisma.case.count()
    const openCases = await prisma.case.count({ where: { status: 'OPEN' } })
    const totalVisits = await prisma.visit.count()
    
    return NextResponse.json({ totalCases, openCases, totalVisits })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
