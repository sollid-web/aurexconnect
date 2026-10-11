import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const params = new URL(req.url).searchParams
  const pageResult = z.coerce.number().int().min(1).safeParse(params.get('page') || '1')
  if (!pageResult.success) return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
  const action = params.get('action')?.trim().slice(0, 80)
  const where = action ? { action: { contains: action, mode: 'insensitive' as const } } : {}
  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (pageResult.data - 1) * 50, take: 50 }),
    prisma.adminAuditLog.count({ where }),
  ])
  return NextResponse.json({ logs, total, page: pageResult.data, limit: 50 })
}
