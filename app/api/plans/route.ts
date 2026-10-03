import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const approvedPlanTerms = {
  'Gold Plan': { roiPercent: 8, minAmount: 50, maxAmount: 999, durationDays: 1, referralBonus: 5 },
  'Silver Plan': { roiPercent: 30, minAmount: 1000, maxAmount: 4999, durationDays: 1, referralBonus: 5 },
  'Bronze Plan': { roiPercent: 60, minAmount: 10000, maxAmount: 49999, durationDays: 3, referralBonus: 5 },
  'Diamond Plan': { roiPercent: 120, minAmount: 100000, maxAmount: null, durationDays: 30, referralBonus: 5 },
} as const

const planSchema = z.object({
  name: z.enum(['Gold Plan', 'Silver Plan', 'Bronze Plan', 'Diamond Plan']),
  roiPercent: z.number().finite().positive().max(1000),
  minAmount: z.number().finite().positive().max(1_000_000_000),
  maxAmount: z.number().finite().positive().max(1_000_000_000).nullable(),
  durationDays: z.number().int().positive().max(3650),
  referralBonus: z.number().finite().min(0).max(100),
  isActive: z.boolean().default(true),
  description: z.string().trim().max(1000).optional().nullable(),
  features: z.array(z.string().trim().min(1).max(200)).max(20).optional().default([]),
}).strict().superRefine((plan, ctx) => {
  const terms = approvedPlanTerms[plan.name]
  for (const key of ['roiPercent', 'minAmount', 'maxAmount', 'durationDays', 'referralBonus'] as const) {
    if (plan[key] !== terms[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${plan.name} must use its approved ${key} value` })
  }
})

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { minAmount: 'asc' } })
    return NextResponse.json(plans)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN' || !session.user.isActive) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let input: z.infer<typeof planSchema>
  try {
    input = planSchema.parse(await req.json())
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.errors[0].message : 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const plan = await prisma.plan.create({ data: input })
    return NextResponse.json(plan, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'That approved plan already exists' }, { status: 409 })
    console.error('[Plan creation]', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
