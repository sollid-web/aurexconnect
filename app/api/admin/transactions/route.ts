import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'
import { createNotification, Notifs } from '@/lib/notifications'
import { depositApprovedEmail, depositRejectedEmail, sendEmail, withdrawalApprovedEmail, withdrawalRejectedEmail } from '@/lib/email'
import { z } from 'zod'

const reviewSchema = z.object({ transactionId: z.string().min(1), action: z.enum(['approve', 'reject']), adminNote: z.string().trim().max(1000).optional().default('') })

// GET — list all pending/all transactions for admin
export async function GET(req: NextRequest) {
  const auth = await requireActiveAdmin()
  const session = auth?.session
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusResult = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'ALL']).safeParse(searchParams.get('status') || 'PENDING')
  const typeResult = z.enum(['DEPOSIT', 'WITHDRAWAL', 'PROFIT', 'REFERRAL_BONUS']).or(z.literal('')).safeParse(searchParams.get('type') || '')
  const pageResult = z.coerce.number().int().min(1).safeParse(searchParams.get('page') || '1')
  if (!statusResult.success || !typeResult.success || !pageResult.success) return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  const status = statusResult.data
  const type = typeResult.data || undefined
  const page = pageResult.data
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
  const auth = await requireActiveAdmin()
  const session = auth?.session
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = reviewSchema.safeParse(await req.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid review request' }, { status: 400 })
  const { transactionId, action, adminNote } = input.data

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
      const result = await prisma.$transaction(async db => {
        const claimed = await db.transaction.updateMany({
          where: { id: tx.id, status: 'PENDING' },
          data: {
            status: 'APPROVED',
            adminNote: adminNote || null,
            reviewedBy: session.user.id,
            reviewedAt: now,
          },
        })
        if (claimed.count !== 1) return false
        await db.user.update({
          where: { id: tx.userId },
          data: {
            balance: { increment: tx.amount },
            totalDeposited: { increment: tx.amount },
          },
        })
        await db.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: tx.userId, action: 'APPROVE_DEPOSIT', details: `${tx.id} · $${tx.amount.toFixed(2)}` } })
        return true
      })
      if (!result) return NextResponse.json({ error: 'Transaction was already reviewed by another administrator' }, { status: 409 })

      await createNotification(
        tx.userId,
        Notifs.depositApproved(tx.amount).title,
        Notifs.depositApproved(tx.amount).message,
        'success',
        '/dashboard'
      )
    } else if (tx.type === 'WITHDRAWAL') {
      // Mark as approved — funds already deducted on request
      const claimed = await prisma.transaction.updateMany({ where: { id: tx.id, status: 'PENDING' }, data: { status: 'APPROVED', adminNote: adminNote || null, reviewedBy: session.user.id, reviewedAt: now } })
      if (claimed.count !== 1) return NextResponse.json({ error: 'Transaction was already reviewed by another administrator' }, { status: 409 })
      await prisma.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: tx.userId, action: 'APPROVE_WITHDRAWAL', details: `${tx.id} · $${tx.amount.toFixed(2)}` } })

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
      const result = await prisma.$transaction(async db => {
        const claimed = await db.transaction.updateMany({
          where: { id: tx.id, status: 'PENDING' },
          data: {
            status: 'REJECTED',
            adminNote: adminNote || null,
            reviewedBy: session.user.id,
            reviewedAt: now,
          },
        })
        if (claimed.count !== 1) return false
        await db.user.update({
          where: { id: tx.userId },
          data: {
            balance: { increment: tx.amount },
            totalWithdrawn: { decrement: tx.amount },
          },
        })
        await db.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: tx.userId, action: 'REJECT_WITHDRAWAL', details: `${tx.id} · $${tx.amount.toFixed(2)}${adminNote ? ` · ${adminNote}` : ''}` } })
        return true
      })
      if (!result) return NextResponse.json({ error: 'Transaction was already reviewed by another administrator' }, { status: 409 })

      await createNotification(
        tx.userId,
        Notifs.withdrawalRejected(tx.amount, adminNote).title,
        Notifs.withdrawalRejected(tx.amount, adminNote).message,
        'error',
        '/dashboard/transactions'
      )
    } else if (tx.type === 'DEPOSIT') {
      // Deposit was never credited — just mark rejected
      const claimed = await prisma.transaction.updateMany({ where: { id: tx.id, status: 'PENDING' }, data: { status: 'REJECTED', adminNote: adminNote || null, reviewedBy: session.user.id, reviewedAt: now } })
      if (claimed.count !== 1) return NextResponse.json({ error: 'Transaction was already reviewed by another administrator' }, { status: 409 })
      await prisma.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: tx.userId, action: 'REJECT_DEPOSIT', details: `${tx.id} · $${tx.amount.toFixed(2)}${adminNote ? ` · ${adminNote}` : ''}` } })

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
