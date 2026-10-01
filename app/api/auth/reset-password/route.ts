import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({ token: z.string().min(32), password: z.string().min(8).max(128) })

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json())
    const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash: createHash('sha256').update(token).digest('hex'), usedAt: null, expiresAt: { gt: new Date() } } })
    if (!record) return NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 })
    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword, isActive: true } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])
    return NextResponse.json({ message: 'Password updated successfully. You can now sign in.' })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 })
  }
}
