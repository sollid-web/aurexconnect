import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const [user, adminAuditLogs] = await Promise.all([
    prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      country: true,
      role: true,
      balance: true,
      totalDeposited: true,
      totalProfit: true,
      totalWithdrawn: true,
      referralCode: true,
      kycStatus: true,
      kycRejectedNote: true,
      isActive: true,
      createdAt: true,
      investments: {
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
      kycSubmissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    }),
    prisma.adminAuditLog.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ ...user, adminAuditLogs })
}
