import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { depositApprovedEmail, depositRejectedEmail, sendEmail, withdrawalApprovedEmail, withdrawalRejectedEmail } from '@/lib/email'
import { transactionListQuerySchema } from '@/lib/admin-query-schema'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

const reviewSchema = z.object({
  transactionId: z.string().min(1).max(128),
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().trim().max(1000).optional().default(''),
}).strict()

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = new URL(req.url).searchParams
  const parsed = transactionListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status, type, or page query parameter' }, { status: 400 })
  const { status, type, page } = parsed.data
  const limit = 20
  const where = {
    ...(status === 'ALL' ? {} : { status }),
    ...(type ? { type } : {}),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, email: true, balance: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total, page, limit })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let input: z.infer<typeof reviewSchema>
  try {
    input = reviewSchema.parse(await req.json())
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid JSON body' }, { status: 400 })
  }

  const txRecord = await prisma.transaction.findUnique({ where: { id: input.transactionId }, include: { user: true } })
  if (!txRecord) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (!['DEPOSIT', 'WITHDRAWAL'].includes(txRecord.type)) {
    return NextResponse.json({ error: 'Only deposit and withdrawal requests can be reviewed' }, { status: 400 })
  }

  const nextStatus = input.action === 'approve' ? 'APPROVED' : 'REJECTED'
  const now = new Date()
  const details = `${txRecord.type} ${input.action}; amount=${txRecord.amount} ${txRecord.currency}${input.adminNote ? `; note=${input.adminNote}` : ''}`

  const transitioned = await prisma.$transaction(async db => {
    const changed = await db.transaction.updateMany({
      where: { id: txRecord.id, status: 'PENDING' },
      data: { status: nextStatus, adminNote: input.adminNote || null, reviewedBy: session.user.id, reviewedAt: now },
    })
    if (changed.count !== 1) return false

    if (txRecord.type === 'DEPOSIT' && input.action === 'approve') {
      await db.user.update({ where: { id: txRecord.userId }, data: { balance: { increment: txRecord.amount }, totalDeposited: { increment: txRecord.amount } } })
    }
    if (txRecord.type === 'WITHDRAWAL' && input.action === 'reject') {
      await db.user.update({ where: { id: txRecord.userId }, data: { balance: { increment: txRecord.amount }, totalWithdrawn: { decrement: txRecord.amount } } })
    }

    await db.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: txRecord.userId, action: `${txRecord.type}_${input.action.toUpperCase()}`, details } })
    return true
  })

  if (!transitioned) return NextResponse.json({ error: 'Transaction already reviewed by another request' }, { status: 409 })

  if (input.action === 'approve' && txRecord.type === 'DEPOSIT') {
    const notice = Notifs.depositApproved(txRecord.amount)
    await createNotification(txRecord.userId, notice.title, notice.message, 'success', '/dashboard')
    await sendEmail(txRecord.user.email, depositApprovedEmail(txRecord.user.fullName, txRecord.amount, txRecord.currency)).catch(error => console.error('[Transaction email]', error))
  } else if (input.action === 'approve') {
    const notice = Notifs.withdrawalApproved(txRecord.amount)
    await createNotification(txRecord.userId, notice.title, notice.message, 'success', '/dashboard/transactions')
    await sendEmail(txRecord.user.email, withdrawalApprovedEmail(txRecord.user.fullName, txRecord.amount, txRecord.currency)).catch(error => console.error('[Transaction email]', error))
  } else if (txRecord.type === 'WITHDRAWAL') {
    const notice = Notifs.withdrawalRejected(txRecord.amount, input.adminNote)
    await createNotification(txRecord.userId, notice.title, notice.message, 'error', '/dashboard/transactions')
    await sendEmail(txRecord.user.email, withdrawalRejectedEmail(txRecord.user.fullName, txRecord.amount, input.adminNote)).catch(error => console.error('[Transaction email]', error))
  } else {
    const notice = Notifs.depositRejected(txRecord.amount, input.adminNote)
    await createNotification(txRecord.userId, notice.title, notice.message, 'error', '/dashboard/transactions')
    await sendEmail(txRecord.user.email, depositRejectedEmail(txRecord.user.fullName, txRecord.amount, input.adminNote)).catch(error => console.error('[Transaction email]', error))
  }

  return NextResponse.json({ message: `Transaction ${input.action}d` })
}
