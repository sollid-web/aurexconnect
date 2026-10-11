import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'
import { createNotification, Notifs } from '@/lib/notifications'
import { kycApprovedEmail, kycRejectedEmail, sendEmail } from '@/lib/email'
import { z } from 'zod'

const reviewSchema = z.object({ submissionId: z.string().min(1), action: z.enum(['approve', 'reject']), adminNote: z.string().trim().max(1000).optional().default('') })

// GET — list all KYC submissions with optional status filter
export async function GET(req: NextRequest) {
  const auth = await requireActiveAdmin()
  const session = auth?.session
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusResult = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).safeParse(searchParams.get('status') || 'PENDING')
  const pageResult = z.coerce.number().int().min(1).safeParse(searchParams.get('page') || '1')
  if (!statusResult.success || !pageResult.success) return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  const status = statusResult.data
  const page = pageResult.data
  const limit = 20

  const where: any = {}
  if (status !== 'ALL') where.status = status

  const [submissions, total] = await Promise.all([
    prisma.kycSubmission.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, kycStatus: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.kycSubmission.count({ where }),
  ])

  return NextResponse.json({ submissions, total, page, limit })
}

// PATCH — approve or reject a KYC submission
export async function PATCH(req: NextRequest) {
  const auth = await requireActiveAdmin()
  const session = auth?.session
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const input = reviewSchema.safeParse(await req.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid review request' }, { status: 400 })
  const { submissionId, action, adminNote } = input.data

  const submission = await prisma.kycSubmission.findUnique({
    where: { id: submissionId },
    include: { user: true },
  })

  if (!submission) return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 })
  if (submission.status !== 'PENDING') {
    return NextResponse.json({ error: 'KYC already reviewed' }, { status: 400 })
  }

  const now = new Date()

  if (action === 'approve') {
    const claimed = await prisma.$transaction(async db => {
      const updated = await db.kycSubmission.updateMany({
        where: { id: submissionId, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          adminNote: adminNote || null,
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      })
      if (updated.count !== 1) return false
      await db.user.update({
        where: { id: submission.userId },
        data: {
          kycStatus: 'APPROVED',
          kycRejectedNote: null,
        },
      })
      await db.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: submission.userId, action: 'APPROVE_KYC', details: `${submissionId}${adminNote ? ` · ${adminNote}` : ''}` } })
      return true
    })
    if (!claimed) return NextResponse.json({ error: 'KYC submission was already reviewed by another administrator' }, { status: 409 })

    await createNotification(
      submission.userId,
      Notifs.kycApproved().title,
      Notifs.kycApproved().message,
      'success',
      '/dashboard'
    )

    await sendEmail(submission.user.email, kycApprovedEmail(submission.user.fullName)).catch(error => console.error('[KYC email]', error))
    return NextResponse.json({ message: 'KYC approved' })
  } else {
    const claimed = await prisma.$transaction(async db => {
      const updated = await db.kycSubmission.updateMany({
        where: { id: submissionId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || null,
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      })
      if (updated.count !== 1) return false
      await db.user.update({
        where: { id: submission.userId },
        data: {
          kycStatus: 'REJECTED',
          kycRejectedNote: adminNote || 'Documents unclear or invalid. Please resubmit.',
        },
      })
      await db.adminAuditLog.create({ data: { adminId: session.user.id, targetUserId: submission.userId, action: 'REJECT_KYC', details: `${submissionId}${adminNote ? ` · ${adminNote}` : ''}` } })
      return true
    })
    if (!claimed) return NextResponse.json({ error: 'KYC submission was already reviewed by another administrator' }, { status: 409 })

    await createNotification(
      submission.userId,
      Notifs.kycRejected(adminNote).title,
      Notifs.kycRejected(adminNote).message,
      'error',
      '/dashboard/kyc'
    )

    await sendEmail(submission.user.email, kycRejectedEmail(submission.user.fullName, adminNote)).catch(error => console.error('[KYC email]', error))
    return NextResponse.json({ message: 'KYC rejected' })
  }
}
