import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = new URL(req.url).searchParams.get('path')
  if (!path || !path.startsWith('neon:')) {
    return NextResponse.json({ error: 'This document is not stored in the Neon KYC vault.' }, { status: 410 })
  }

  const documentId = path.slice('neon:'.length)
  if (!documentId || documentId.includes('/') || documentId.includes('..')) {
    return NextResponse.json({ error: 'Invalid document request' }, { status: 400 })
  }

  const document = await prisma.kycDocument.findUnique({
    where: { id: documentId },
    select: { data: true, mimeType: true, originalName: true },
  })
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  return new Response(new Uint8Array(document.data), {
    headers: {
      'Content-Type': document.mimeType,
      'Content-Disposition': `inline; filename="${document.originalName.replace(/["\\\r\n]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
