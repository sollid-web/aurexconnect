import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'
import { z } from 'zod'

const planSchema = z.object({ name: z.string().trim().min(2).max(50), roiPercent: z.coerce.number().finite().min(0).max(10000), minAmount: z.coerce.number().finite().min(0), maxAmount: z.number().finite().positive().nullable(), durationDays: z.coerce.number().int().min(1).max(3650), referralBonus: z.coerce.number().finite().min(0).max(100), description: z.string().max(500).nullable().optional(), features: z.array(z.string().max(160)).max(20).default([]), isActive: z.boolean().default(true) })

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' },
    })
    return NextResponse.json(plans)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!await requireActiveAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await requireActiveAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = planSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    const plan = await prisma.plan.create({ data: parsed.data })
    await prisma.adminAuditLog.create({ data: { adminId: auth.user.id, targetUserId: auth.user.id, action: 'CREATE_PLAN', details: plan.name, newValue: JSON.stringify(parsed.data) } })
    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const idResult = z.string().min(1).safeParse(body.id)
  const parsed = planSchema.safeParse(body)
  if (!idResult.success || !parsed.success) return NextResponse.json({ error: parsed.success ? 'Plan id is required' : parsed.error.errors[0].message }, { status: 400 })
  const old = await prisma.plan.findUnique({ where: { id: idResult.data } })
  if (!old) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  const plan = await prisma.plan.update({ where: { id: old.id }, data: parsed.data })
  await prisma.adminAuditLog.create({ data: { adminId: auth.user.id, targetUserId: auth.user.id, action: 'UPDATE_PLAN', details: plan.name, previousValue: JSON.stringify({ roiPercent: old.roiPercent, minAmount: old.minAmount, maxAmount: old.maxAmount, durationDays: old.durationDays, isActive: old.isActive }), newValue: JSON.stringify(parsed.data) } })
  return NextResponse.json(plan)
}
