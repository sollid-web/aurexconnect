import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail, welcomeEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: createHash('sha256').update(`verify:${token}`).digest('hex'), usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  })
  if (!record) return NextResponse.json({ error: 'This verification link is invalid or expired' }, { status: 400 })
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])
  await sendEmail(record.user.email, welcomeEmail(record.user.fullName)).catch(error => console.error('[Welcome email]', error))
  return NextResponse.redirect(new URL('/auth/login?verified=1', req.url))
}
