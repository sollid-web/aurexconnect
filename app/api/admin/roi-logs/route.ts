import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'

export async function GET() {
  if (!await requireActiveAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await prisma.roiProcessingLog.findMany({
    orderBy: { processedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ logs })
}
