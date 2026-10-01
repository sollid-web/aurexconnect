import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendEmail, verificationEmail } from '@/lib/email'
import { rateLimit, requestIp } from '@/lib/rate-limit'

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().trim().max(40).optional(),
  country: z.string().trim().max(80).optional(),
  referralCode: z.string().trim().max(80).optional(),
})

export async function POST(req: NextRequest) {
  const limit = rateLimit(`register:${requestIp(req)}`, 5, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
  try {
    const data = registerSchema.parse(await req.json())
    const email = data.email.toLowerCase()
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    let referredBy: string | undefined
    if (data.referralCode) {
      const referrer = await prisma.user.findFirst({ where: { referralCode: data.referralCode } })
      if (referrer) referredBy = referrer.id
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const verificationToken = randomBytes(32).toString('hex')
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: data.fullName,
        phone: data.phone,
        country: data.country,
        referredBy,
        isActive: true,
        emailVerified: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false' ? null : new Date(),
      },
      select: { id: true, email: true, fullName: true, role: true },
    })

    if (process.env.REQUIRE_EMAIL_VERIFICATION !== 'false') {
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(`verify:${verificationToken}`).digest('hex'),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      await sendEmail(user.email, verificationEmail(user.fullName, verificationToken))
      return NextResponse.json({ message: 'Account created. Check your email to verify your account.', user }, { status: 201 })
    }

    return NextResponse.json({ message: 'Account created successfully', user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
