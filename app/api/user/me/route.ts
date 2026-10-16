import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuth } from '@/lib/server-auth'
import { z } from 'zod'

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
})

export async function GET() {
  try {
    const auth = await getActiveAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = auth.session

    const [user, referredUsers] = await Promise.all([
      prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        country: true,
        role: true,
        balance: true,
        totalDeposited: true,
        totalProfit: true,
        totalWithdrawn: true,
        referralCode: true,
        referredBy: true,
        isActive: true,
        createdAt: true,
        investments: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      }),
      prisma.user.findMany({
        where: { referredBy: session.user.id },
        select: { id: true, email: true, fullName: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ ...user, referrals: { count: referredUsers.length, users: referredUsers } })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getActiveAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = auth.session

    const input = profileSchema.parse(await req.json())
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName: input.fullName,
        phone: input.phone || null,
        country: input.country || null,
      },
      select: { id: true, fullName: true, email: true, phone: true, country: true, role: true },
    })

    return NextResponse.json({ message: 'Profile updated successfully', user })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
