import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const methods = await prisma.walletAddress.findMany({
      where: { isActive: true },
      select: { id: true, currency: true, label: true, address: true, network: true, updatedAt: true },
      orderBy: [{ label: 'asc' }, { currency: 'asc' }],
    })
    return NextResponse.json({ methods })
  } catch (error) {
    console.error('[Payment methods]', error)
    return NextResponse.json({ error: 'Could not load payment methods' }, { status: 500 })
  }
}
