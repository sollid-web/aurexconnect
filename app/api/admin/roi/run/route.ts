import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST() {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = process.env.CRON_SECRET
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  if (!secret || !baseUrl) return NextResponse.json({ error: 'ROI engine is not configured' }, { status: 503 })

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/cron/process-roi`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({ error: 'ROI engine returned an invalid response' }))
  await prisma.adminAuditLog.create({
    data: {
      adminId: auth.user.id,
      targetUserId: auth.user.id,
      action: 'TRIGGER_ROI_ENGINE',
      details: `status=${response.status} · processed=${data.investmentsDone ?? 0} · paid=${data.totalProfitPaid ?? 0}`,
    },
  })
  return NextResponse.json(data, { status: response.status })
}
