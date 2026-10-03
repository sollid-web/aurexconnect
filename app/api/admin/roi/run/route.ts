import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processRoiInvestments } from '@/lib/roi-engine'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN' || !session.user.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processRoiInvestments()
    const targets = result.affectedUserIds.length ? result.affectedUserIds : [session.user.id]
    const details = `manual ROI runId=${result.runId}; investmentsFound=${result.investmentsFound}; investmentsDone=${result.investmentsDone}; totalProfitPaid=${result.totalProfitPaid}`
    await prisma.adminAuditLog.createMany({
      data: targets.map(targetUserId => ({ adminId: session.user.id, targetUserId, action: 'MANUAL_ROI_RUN', details })),
    })
    const { affectedUserIds: _affectedUserIds, ...response } = result
    return NextResponse.json(response)
  } catch (error) {
    console.error('[Admin ROI run]', error)
    return NextResponse.json({ error: 'ROI run failed; check the ROI log for details' }, { status: 500 })
  }
}
