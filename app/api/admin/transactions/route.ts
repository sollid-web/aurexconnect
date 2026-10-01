import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { depositApprovedEmail, depositRejectedEmail, sendEmail, withdrawalApprovedEmail, withdrawalRejectedEmail } from '@/lib/email'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

// GET — list all pending/all transactions for admin
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'
  const type = searchParams.get('type') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where: any = {}
  if (status !== 'ALL') where.status = status
  if (type) where.type = type

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, balance: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total, page, limit })
}

// PATCH — approve or reject a deposit/withdrawal
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactionId, action, adminNote } = await req.json()

  if (!transactionId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true },
  })

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (tx.status !== 'PENDING') {
    return NextResponse.json({ error: 'Transaction already reviewed' }, { status: 400 })
  }

  const now = new Date()

  if (action === 'approve') {
    // ── APPROVE ────────────────────────────────────────────
    if (tx.type === 'DEPOSIT') {
      // Credit user balance and update totals
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: 'APPROVED',
            adminNote: adminNote || null,
            reviewedBy: session.user.id,
            reviewedAt: now,
          },
        }),
        prisma.user.update({
          where: { id: tx.userId },
          data: {
            balance: { increment: tx.amount },
            totalDeposited: { increment: tx.amount },
          },
        }),
      ])

      await createNotification(
        tx.userId,
        Notifs.depositApproved(tx.amount).title,
        Notifs.depositApproved(tx.amount).message,
        'success',
        '/dashboard'
      )
    } else if (tx.type === 'WITHDRAWAL') {
      // Mark as approved — funds already deducted on request
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: 'APPROVED',
          adminNote: adminNote || null,
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      })

      await createNotification(
        tx.userId,
        Notifs.withdrawalApproved(tx.amount).title,
        Notifs.withdrawalApproved(tx.amount).message,
        'success',
        '/dashboard/transactions'
      )
    }

    if (tx.type === 'DEPOSIT') await sendEmail(tx.user.email, depositApprovedEmail(tx.user.fullName, tx.amount, tx.currency)).catch(error => console.error('[Transaction email]', error))
    if (tx.type === 'WITHDRAWAL') await sendEmail(tx.user.email, withdrawalApprovedEmail(tx.user.fullName, tx.amount, tx.currency)).catch(error => console.error('[Transaction email]', error))
    return NextResponse.json({ message: 'Transaction approved' })
  } else {
    // ── REJECT ─────────────────────────────────────────────
    if (tx.type === 'WITHDRAWAL') {
      // Refund the withheld balance back to user
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: 'REJECTED',
            adminNote: adminNote || null,
            reviewedBy: session.user.id,
            reviewedAt: now,
          },
        }),
        prisma.user.update({
          where: { id: tx.userId },
          data: {
            balance: { increment: tx.amount },
            totalWithdrawn: { decrement: tx.amount },
          },
        }),
      ])

      await createNotification(
        tx.userId,
        Notifs.withdrawalRejected(tx.amount, adminNote).title,
        Notifs.withdrawalRejected(tx.amount, adminNote).message,
        'error',
        '/dashboard/transactions'
      )
    } else if (tx.type === 'DEPOSIT') {
      // Deposit was never credited — just mark rejected
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || null,
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      })

      await createNotification(
        tx.userId,
        Notifs.depositRejected(tx.amount, adminNote).title,
        Notifs.depositRejected(tx.amount, adminNote).message,
        'error',
        '/dashboard/transactions'
      )
    }

    if (tx.type === 'DEPOSIT') await sendEmail(tx.user.email, depositRejectedEmail(tx.user.fullName, tx.amount, adminNote)).catch(error => console.error('[Transaction email]', error))
    if (tx.type === 'WITHDRAWAL') await sendEmail(tx.user.email, withdrawalRejectedEmail(tx.user.fullName, tx.amount, adminNote)).catch(error => console.error('[Transaction email]', error))
    return NextResponse.json({ message: 'Transaction rejected' })
  }
}
