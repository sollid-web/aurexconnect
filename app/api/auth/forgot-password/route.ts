import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { passwordResetEmail, sendEmail } from '@/lib/email'
import { rateLimit, requestIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const limit = rateLimit(`forgot-password:${requestIp(req)}`, 5, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  try {
    const { email } = z.object({ email: z.string().trim().email() }).parse(await req.json())
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (user) {
      const token = randomBytes(32).toString('hex')
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } })
      await sendEmail(user.email, passwordResetEmail(user.fullName, token))
    }
    return NextResponse.json({ message: 'If an account exists for that email, a reset link has been sent.' })
  } catch {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
}
