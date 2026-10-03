import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
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
