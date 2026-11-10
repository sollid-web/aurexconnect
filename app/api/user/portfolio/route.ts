import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { usdToApx } from '@/lib/apx'

const DAY_MS = 24 * 60 * 60 * 1000

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateLabel(key: string) {
  return new Date(`${key}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const range = new URL(req.url).searchParams.get('range') || '30'
    const days = range === '7' ? 7 : range === '90' ? 90 : range === 'all' ? 365 : 30
    const now = new Date()
    const start = new Date(now.getTime() - (days - 1) * DAY_MS)

    const [user, investments, transactions] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true, apxBalance: true, totalDeposited: true, totalProfit: true, totalApxEarned: true, totalWithdrawn: true, kycStatus: true, emailVerified: true, isActive: true } }),
      prisma.investment.findMany({ where: { userId: session.user.id }, include: { plan: true }, orderBy: { createdAt: 'desc' } }),
      prisma.transaction.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' }, take: 1000 }),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const chartStart = range === 'all' && transactions.length ? new Date(Math.min(start.getTime(), transactions[0].createdAt.getTime())) : start
    const chartDays = Math.min(365, Math.max(1, Math.ceil((now.getTime() - chartStart.getTime()) / DAY_MS) + 1))
    const chartKeys = Array.from({ length: chartDays }, (_, index) => dayKey(new Date(chartStart.getTime() + index * DAY_MS)))
    const usdTransactions = transactions.filter(tx => tx.currency !== 'APX')
    const profitBeforeStart = usdTransactions.filter(tx => tx.type === 'PROFIT' && tx.createdAt < chartStart && ['COMPLETED', 'APPROVED'].includes(tx.status)).reduce((sum, tx) => sum + tx.amount, 0)
    let cumulativeRoi = profitBeforeStart
    const byDay = new Map<string, { roi: number; deposits: number; withdrawals: number }>()
    for (const key of chartKeys) byDay.set(key, { roi: 0, deposits: 0, withdrawals: 0 })

    for (const tx of usdTransactions) {
      if (tx.createdAt < chartStart || !byDay.has(dayKey(tx.createdAt)) || !['COMPLETED', 'APPROVED'].includes(tx.status)) continue
      const day = byDay.get(dayKey(tx.createdAt))!
      if (tx.type === 'PROFIT' || tx.type === 'REFERRAL_BONUS') day.roi += tx.amount
      if (tx.type === 'DEPOSIT') day.deposits += tx.amount
      if (tx.type === 'WITHDRAWAL') day.withdrawals += tx.amount
    }

    const performance = chartKeys.map(key => {
      const day = byDay.get(key)!
      cumulativeRoi += day.roi
      return { date: key, label: dateLabel(key), roi: Number(day.roi.toFixed(2)), cumulativeRoi: Number(cumulativeRoi.toFixed(2)), deposits: Number(day.deposits.toFixed(2)), withdrawals: Number(day.withdrawals.toFixed(2)) }
    })

    const active = investments.filter(investment => investment.status === 'ACTIVE')
    const allocationMap = new Map<string, { name: string; invested: number; expectedProfit: number; roiPaid: number; color: string }>()
    for (const investment of active) {
      const current = allocationMap.get(investment.plan.name) || { name: investment.plan.name, invested: 0, expectedProfit: 0, roiPaid: 0, color: '#c9a84c' }
      current.invested += investment.amount
      current.expectedProfit += investment.expectedProfit
      current.roiPaid += investment.roiPaid
      allocationMap.set(investment.plan.name, current)
    }

    const nextPayouts = active.map(investment => {
      const remainingUsdProfit = Math.max(0, investment.expectedProfit - investment.roiPaid)
      return { apxAmount: usdToApx(remainingUsdProfit), at: investment.endDate, plan: investment.plan.name }
    }).sort((a, b) => a.at.getTime() - b.at.getTime())
    const nextPayout = nextPayouts[0] || null

    return NextResponse.json({
      summary: {
        balance: user.balance,
        apxBalance: user.apxBalance,
        totalDeposited: user.totalDeposited,
        totalProfit: user.totalProfit,
        totalApxEarned: user.totalApxEarned,
        totalWithdrawn: user.totalWithdrawn,
        activeInvestments: active.length,
        activeCapital: active.reduce((sum, investment) => sum + investment.amount, 0),
        roiPaidOnActive: active.reduce((sum, investment) => sum + investment.roiPaid, 0),
        expectedRoiOnActive: active.reduce((sum, investment) => sum + investment.expectedProfit, 0),
      },
      health: { emailVerified: Boolean(user.emailVerified), kycStatus: user.kycStatus, isActive: user.isActive },
      performance,
      allocation: Array.from(allocationMap.values()).map(item => ({ ...item, invested: Number(item.invested.toFixed(2)), expectedProfit: Number(item.expectedProfit.toFixed(2)), roiPaid: Number(item.roiPaid.toFixed(2)) })),
      nextPayout: nextPayout ? { apxAmount: nextPayout.apxAmount, at: nextPayout.at, plan: nextPayout.plan } : null,
      recentActivity: transactions.slice(-12).reverse(),
    })
  } catch (error) {
    console.error('Portfolio aggregation error:', error)
    return NextResponse.json({ error: 'Failed to load portfolio data' }, { status: 500 })
  }
}
