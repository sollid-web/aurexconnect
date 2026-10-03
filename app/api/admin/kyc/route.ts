import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { kycApprovedEmail, kycRejectedEmail, sendEmail } from '@/lib/email'
import { kycListQuerySchema } from '@/lib/admin-query-schema'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

const reviewSchema = z.object({
  submissionId: z.string().min(1).max(128),
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().trim().max(1000).optional().default(''),
}).strict()

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = new URL(req.url).searchParams
  const parsed = kycListQuerySchema.safeParse(Object.fromEntries(searchParams.entries()))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid KYC status or page query parameter' }, { status: 400 })
  const { status, page } = parsed.data
  const limit = 20
  const where = status === 'ALL' ? {} : { status }

  const [submissions, total] = await Promise.all([
    prisma.kycSubmission.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, email: true, kycStatus: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.kycSubmission.count({ where }),
  ])

  return NextResponse.json({ submissions, total, page, limit })
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

  const submission = await prisma.kycSubmission.findUnique({ where: { id: input.submissionId }, include: { user: true } })
  if (!submission) return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 })

  const nextStatus = input.action === 'approve' ? 'APPROVED' : 'REJECTED'
  const now = new Date()
  const rejectionNote = input.adminNote || 'Documents unclear or invalid. Please resubmit.'
  const changed = await prisma.$transaction(async db => {
    const transitioned = await db.kycSubmission.updateMany({
      where: { id: submission.id, status: 'PENDING' },
      data: { status: nextStatus, adminNote: input.adminNote || null, reviewedBy: session.user.id, reviewedAt: now },
    })
    if (transitioned.count !== 1) return false

    const userTransition = await db.user.updateMany({
      where: { id: submission.userId, kycStatus: 'PENDING' },
      data: { kycStatus: nextStatus, kycRejectedNote: input.action === 'approve' ? null : rejectionNote },
    })
    if (userTransition.count !== 1) throw new Error('KYC_USER_STATE_CONFLICT')

    await db.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        targetUserId: submission.userId,
        action: `KYC_${input.action.toUpperCase()}`,
        details: `submissionId=${submission.id}; documentType=${submission.documentType}; status=${nextStatus}${input.adminNote ? `; note=${input.adminNote}` : ''}`,
      },
    })
    return true
  }).catch(error => {
    if (error instanceof Error && error.message === 'KYC_USER_STATE_CONFLICT') return false
    throw error
  })

  if (!changed) return NextResponse.json({ error: 'KYC submission or user status was already reviewed' }, { status: 409 })

  if (input.action === 'approve') {
    const notice = Notifs.kycApproved()
    await createNotification(submission.userId, notice.title, notice.message, 'success', '/dashboard')
    await sendEmail(submission.user.email, kycApprovedEmail(submission.user.fullName)).catch(error => console.error('[KYC email]', error))
    return NextResponse.json({ message: 'KYC approved' })
  }

  const notice = Notifs.kycRejected(input.adminNote)
  await createNotification(submission.userId, notice.title, notice.message, 'error', '/dashboard/kyc')
  await sendEmail(submission.user.email, kycRejectedEmail(submission.user.fullName, input.adminNote)).catch(error => console.error('[KYC email]', error))
  return NextResponse.json({ message: 'KYC rejected' })
}
