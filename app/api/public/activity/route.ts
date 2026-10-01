import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function anonymizeName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Verified investor'
  if (parts.length === 1) return `${parts[0][0].toUpperCase()}***`
  return `${parts[0][0].toUpperCase()}*** ${parts[parts.length - 1][0].toUpperCase()}.`
}

function activityLabel(type: string) {
  if (type === 'DEPOSIT') return 'completed a deposit'
  if (type === 'WITHDRAWAL') return 'completed a withdrawal'
  if (type === 'PROFIT') return 'received an ROI credit'
  return 'received a referral bonus'
}

export async function GET() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const eventSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const eligibleTypes = ['DEPOSIT', 'WITHDRAWAL', 'PROFIT', 'REFERRAL_BONUS'] as const
  const eligibleStatuses = ['APPROVED', 'COMPLETED'] as const

  try {
    const [events, recentMetrics, activeInvestments] = await Promise.all([
      prisma.transaction.findMany({
        where: { type: { in: [...eligibleTypes] }, status: { in: [...eligibleStatuses] }, createdAt: { gte: eventSince } },
        select: { id: true, type: true, amount: true, currency: true, createdAt: true, user: { select: { fullName: true, country: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.transaction.aggregate({
        where: { type: { in: [...eligibleTypes] }, status: { in: [...eligibleStatuses] }, createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.investment.count({ where: { status: 'ACTIVE' } }),
    ])

    return NextResponse.json({
      available: true,
      updatedAt: new Date().toISOString(),
      metrics: {
        transactionsLast24h: recentMetrics._count._all,
        volumeLast24h: Number((recentMetrics._sum.amount || 0).toFixed(2)),
        activeInvestments,
      },
      events: events.map(event => ({
        id: event.id,
        label: activityLabel(event.type),
        name: anonymizeName(event.user.fullName),
        country: event.user.country || null,
        amount: event.amount,
        currency: event.currency,
        type: event.type,
        createdAt: event.createdAt,
      })),
    }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } })
  } catch (error) {
    console.error('[Public activity]', error)
    return NextResponse.json({ available: false, metrics: null, events: [] }, { status: 200 })
  }
}
