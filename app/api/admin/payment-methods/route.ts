import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'

const methodSchema = z.object({
  currency: z.string().trim().min(2).max(12).transform(value => value.toUpperCase()),
  name: z.string().trim().min(2).max(80),
  network: z.string().trim().min(2).max(80),
  address: z.string().trim().min(8).max(255),
  minDeposit: z.coerce.number().finite().min(0),
  maxDeposit: z.number().finite().positive().nullable().optional(),
  requiredConfirmations: z.coerce.number().int().min(0).max(100).default(1),
  requiresTxHash: z.boolean().default(true),
  requiresProof: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isMaintenance: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  instructions: z.string().trim().max(1000).nullable().optional(),
})

export async function GET() {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ paymentMethods: await prisma.paymentMethod.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }) })
}

export async function POST(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = methodSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  const method = await prisma.paymentMethod.create({ data: { ...parsed.data, updatedBy: auth.user.id } })
  await prisma.adminAuditLog.create({ data: { adminId: auth.user.id, targetUserId: auth.user.id, action: 'CREATE_PAYMENT_METHOD', details: `${method.currency} · ${method.network}`, newValue: JSON.stringify({ id: method.id, address: method.address }) } })
  return NextResponse.json({ paymentMethod: method }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const idResult = z.string().min(1).safeParse(body.id)
  const parsed = methodSchema.safeParse(body)
  if (!idResult.success || !parsed.success) return NextResponse.json({ error: parsed.success ? 'Payment method id is required' : parsed.error.errors[0].message }, { status: 400 })
  const old = await prisma.paymentMethod.findUnique({ where: { id: idResult.data } })
  if (!old) return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
  const method = await prisma.paymentMethod.update({ where: { id: old.id }, data: { ...parsed.data, updatedBy: auth.user.id } })
  await prisma.adminAuditLog.create({ data: { adminId: auth.user.id, targetUserId: auth.user.id, action: 'UPDATE_PAYMENT_METHOD', details: `${method.currency} · ${method.network}`, previousValue: JSON.stringify({ address: old.address, isActive: old.isActive, isMaintenance: old.isMaintenance }), newValue: JSON.stringify({ address: method.address, isActive: method.isActive, isMaintenance: method.isMaintenance }) } })
  return NextResponse.json({ paymentMethod: method })
}
