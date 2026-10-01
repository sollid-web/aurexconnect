import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { investmentActivatedEmail, sendEmail } from '@/lib/email'

const investSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),
  amount: z.number().positive('Amount must be positive'),
})

// ── POST — user purchases an investment ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { planId, amount } = investSchema.parse(body)

    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    if (!plan.isActive) return NextResponse.json({ error: 'This plan is no longer available' }, { status: 400 })

    if (amount < plan.minAmount || (plan.maxAmount !== null && amount > plan.maxAmount)) {
      return NextResponse.json(
        { error: `Amount must be at least $${plan.minAmount.toLocaleString()}${plan.maxAmount === null ? '' : ` and no more than $${plan.maxAmount.toLocaleString()}`}` },
        { status: 400 }
      )
    }

    if (user.balance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have $${user.balance.toFixed(2)} but need $${amount.toFixed(2)}. Please deposit funds first.` },
        { status: 400 }
      )
    }

    const expectedProfit = parseFloat(((amount * plan.roiPercent) / 100).toFixed(2))
    const endDate = addDays(new Date(), plan.durationDays)

    // Atomic: create investment + deduct balance + record transaction
    const [investment] = await prisma.$transaction([
      prisma.investment.create({
        data: {
          userId: user.id,
          planId: plan.id,
          amount,
          expectedProfit,
          endDate,
        },
        include: { plan: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount,
          note: `Investment purchased — ${plan.name}`,
        },
      }),
    ])

    // Fire notification
    await createNotification(
      user.id,
      '🚀 Investment Activated',
      `Your $${amount.toFixed(2)} investment in the ${plan.name} is now active. Your total ROI of $${expectedProfit.toFixed(2)} will be credited in daily installments over ${plan.durationDays} day(s).`,
      'success',
      '/dashboard'
    )
    await sendEmail(user.email, investmentActivatedEmail(user.fullName, plan.name, amount, expectedProfit, plan.durationDays)).catch(error => console.error('[Investment email]', error))

    return NextResponse.json(
      {
        message: 'Investment created successfully',
        investment,
        expectedProfit,
        endDate,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Investment error:', error)
    return NextResponse.json({ error: 'Failed to create investment. Please try again.' }, { status: 500 })
  }
}

// ── GET — user's investments ─────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    // Annotate each with progress percentage
    const now = new Date()
    const annotated = investments.map(inv => {
      const totalMs = inv.endDate.getTime() - inv.startDate.getTime()
      const elapsedMs = now.getTime() - inv.startDate.getTime()
      const progress = inv.status === 'COMPLETED' ? 100 : Math.min(100, Math.round((elapsedMs / totalMs) * 100))
      const daysLeft = Math.max(0, Math.ceil((inv.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      return { ...inv, progress, daysLeft }
    })

    return NextResponse.json(annotated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 })
  }
}
