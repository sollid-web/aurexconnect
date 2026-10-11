import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'
import { DEFAULT_SETTINGS } from '@/lib/settings'

const settingsSchema = z.record(z.string().min(1).max(80), z.union([z.string().max(500), z.boolean(), z.number().finite()]))

export async function GET() {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } })
  const settings = { ...Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, item]) => [key, item.value])), ...Object.fromEntries(rows.map(row => [row.key, row.value])) }
  return NextResponse.json({ settings, rows })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = settingsSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })

  const allowed = new Set([...Object.keys(DEFAULT_SETTINGS), 'deposit_minimum', 'withdrawal_minimum', 'withdrawal_maximum', 'withdrawal_fee_percent', 'support_email', 'maintenance_message'])
  const entries = Object.entries(parsed.data).filter(([key]) => allowed.has(key))
  await prisma.$transaction(async db => {
    for (const [key, value] of entries) {
      const old = await db.siteSetting.findUnique({ where: { key }, select: { value: true, valueType: true } })
      const valueType = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string'
      await db.siteSetting.upsert({ where: { key }, update: { value: String(value), valueType, updatedBy: auth.user.id }, create: { key, value: String(value), valueType, updatedBy: auth.user.id } })
      await db.adminAuditLog.create({ data: { adminId: auth.user.id, targetUserId: auth.user.id, action: 'UPDATE_SITE_SETTING', details: key, previousValue: old?.value || null, newValue: String(value) } })
    }
  })
  return NextResponse.json({ message: 'Settings updated' })
}
