import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN' || !session.user.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = new URL(req.url).searchParams.get('path')
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'kyc-documents'
  if (!path || !supabaseUrl || !serviceKey || path.includes('..') || path.startsWith('/') || path.includes('://')) {
    return NextResponse.json({ error: 'Invalid file request' }, { status: 400 })
  }

  const submission = await prisma.kycSubmission.findFirst({
    where: { OR: [{ frontImageUrl: path }, { backImageUrl: path }, { selfieUrl: path }] },
    select: { id: true, userId: true },
  })
  if (!submission) return NextResponse.json({ error: 'KYC document not found' }, { status: 404 })

  await prisma.adminAuditLog.create({
    data: {
      adminId: session.user.id,
      targetUserId: submission.userId,
      action: 'ACCESS_KYC_DOCUMENT',
      details: `submissionId=${submission.id}; documentPath=${path}`,
    },
  })

  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 300 }),
  })
  if (!response.ok) return NextResponse.json({ error: 'Unable to access document' }, { status: 502 })
  const data = await response.json()
  return NextResponse.json({ url: `${supabaseUrl}/storage/v1${data.signedURL}` })
}
