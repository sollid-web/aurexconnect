import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!await requireActiveAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
