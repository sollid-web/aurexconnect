import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'
import { customAdminEmail, randomizedCampaignEmail, sendEmail } from '@/lib/email'
import { adminEmailSchema } from '@/lib/admin-email-schema'
import { z } from 'zod'

export async function GET() {
  if (!await requireActiveAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await prisma.user.findMany({ where: { role: 'USER', isActive: true }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: 'asc' } })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const input = adminEmailSchema.parse(await req.json())
    if (input.audience === 'selected' && input.userIds.length === 0) return NextResponse.json({ error: 'Select at least one user' }, { status: 400 })
    if (input.template === 'custom' && (!input.subject || !input.message)) return NextResponse.json({ error: 'Subject and message are required for a custom email' }, { status: 400 })

    const users = await prisma.user.findMany({
      where: input.audience === 'all' ? { role: 'USER', isActive: true } : { id: { in: input.userIds }, role: 'USER', isActive: true },
      select: { id: true, fullName: true, email: true },
      take: 500,
    })
    if (!users.length) return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 })

    const results: PromiseSettledResult<{ sent: boolean }>[] = []
    for (let index = 0; index < users.length; index += 10) {
      const batch = users.slice(index, index + 10)
      results.push(...await Promise.allSettled(batch.map(user => sendEmail(user.email, input.template === 'custom' ? customAdminEmail(input.subject!, input.message!) : randomizedCampaignEmail(user.fullName)))))
    }
    const sent = results.filter(result => result.status === 'fulfilled' && result.value.sent).length
    const failed = results.length - sent
    await prisma.adminAuditLog.create({
      data: {
        adminId: auth.user.id,
        targetUserId: auth.user.id,
        action: 'SEND_EMAIL_CAMPAIGN',
        details: `${input.template} · audience=${input.audience} · recipients=${users.length} · sent=${sent} · failed=${failed}`,
      },
    })
    return NextResponse.json({ message: `Campaign processed for ${users.length} recipient(s)`, recipients: users.length, sent, failed })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('Admin email error:', error)
    return NextResponse.json({ error: 'Campaign could not be sent' }, { status: 500 })
  }
}
