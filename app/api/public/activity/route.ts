import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type ActivityEvent = {
  id: string
  label: string
  name: string
  country: string | null
  amount: number
  currency: string
  type: string
  createdAt: Date
}

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

function previewEvents(now = Date.now()): ActivityEvent[] {
  const examples = [
    ['preview-1', 'A new investor', 'completed a $500 deposit', 500, 'DEPOSIT', 8],
    ['preview-2', 'A portfolio member', 'started a Gold Plan position', 250, 'PROFIT', 34],
    ['preview-3', 'A community investor', 'completed a $1,000 deposit', 1000, 'DEPOSIT', 71],
    ['preview-4', 'A returning member', 'received an ROI credit', 40, 'PROFIT', 118],
    ['preview-5', 'A verified member', 'completed a withdrawal', 300, 'WITHDRAWAL', 205],
    ['preview-6', 'A new investor', 'started exploring investment plans', 100, 'REFERRAL_BONUS', 297],
  ] as const

  return examples.map(([id, name, label, amount, type, minutesAgo]) => ({
    id,
    name,
    label,
    amount,
    type,
    currency: 'USD',
    country: null,
    createdAt: new Date(now - minutesAgo * 60 * 1000),
  }))
}

function previewResponse() {
  return {
    available: true,
    source: 'preview' as const,
    updatedAt: new Date().toISOString(),
    metrics: null,
    events: previewEvents(),
  }
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

    if (!events.length) return NextResponse.json(previewResponse(), { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } })

    return NextResponse.json({
      available: true,
      source: 'live',
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
    return NextResponse.json(previewResponse(), { status: 200 })
  }
}
