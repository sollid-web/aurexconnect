import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxBytes) {
      return NextResponse.json({ error: 'Upload a JPG, PNG, or WEBP image up to 8 MB.' }, { status: 400 })
    }

    const document = await prisma.kycDocument.create({
      data: {
        userId: session.user.id,
        data: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type,
        originalName: file.name.slice(0, 255) || `${randomUUID()}.${file.type.split('/')[1]}`,
      },
      select: { id: true },
    })

    return NextResponse.json({ path: `neon:${document.id}` })
  } catch (error) {
    console.error('Neon KYC document upload failed', error)
    return NextResponse.json({ error: 'Document upload failed. Please try again.' }, { status: 500 })
  }
}
