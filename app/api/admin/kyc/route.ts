import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { kycApprovedEmail, kycRejectedEmail, sendEmail } from '@/lib/email'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

// GET — list all KYC submissions with optional status filter
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'
  const page = parseInt(searchParams.get('page') || '1')
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
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { submissionId, action, adminNote } = await req.json()

  if (!submissionId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

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
    await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          adminNote: adminNote || null,
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      }),
      prisma.user.update({
        where: { id: submission.userId },
        data: {
          kycStatus: 'APPROVED',
          kycRejectedNote: null,
        },
      }),
    ])

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
    await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || null,
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      }),
      prisma.user.update({
        where: { id: submission.userId },
        data: {
          kycStatus: 'REJECTED',
          kycRejectedNote: adminNote || 'Documents unclear or invalid. Please resubmit.',
        },
      }),
    ])

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
