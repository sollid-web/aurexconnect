import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'

export async function GET() {
  if (!await requireActiveAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    totalUsers,
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    activeInvestments,
    depositStats,
    withdrawalStats,
    profitStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count({ where: { type: 'DEPOSIT', status: 'PENDING' } }),
    prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
    prisma.kycSubmission.count({ where: { status: 'PENDING' } }),
    prisma.investment.count({ where: { status: 'ACTIVE' } }),
    prisma.transaction.aggregate({
      where: { type: 'DEPOSIT', status: 'APPROVED' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'WITHDRAWAL', status: 'APPROVED' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'PROFIT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    totalUsers,
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    activeInvestments,
    totalDeposits: depositStats._sum.amount ?? 0,
    totalWithdrawals: withdrawalStats._sum.amount ?? 0,
    totalProfit: profitStats._sum.amount ?? 0,
  })
}
