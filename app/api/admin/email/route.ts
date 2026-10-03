import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { customAdminEmail, randomizedCampaignEmail, sendEmail } from '@/lib/email'
import { adminEmailSchema } from '@/lib/admin-email-schema'

const MAX_CAMPAIGN_RECIPIENTS = 500

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const where = { role: 'USER' as const, isActive: true }
  const [users, eligibleCount] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, fullName: true, email: true }, orderBy: { fullName: 'asc' } }),
    prisma.user.count({ where }),
  ])
  return NextResponse.json({ users, eligibleCount, recipientLimit: MAX_CAMPAIGN_RECIPIENTS })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const input = adminEmailSchema.parse(await req.json())
    if (input.audience === 'selected' && input.userIds.length === 0) return NextResponse.json({ error: 'Select at least one user' }, { status: 400 })
    if (input.template === 'custom' && (!input.subject || !input.message)) return NextResponse.json({ error: 'Subject and message are required for a custom email' }, { status: 400 })

    const eligibleWhere = input.audience === 'all'
      ? { role: 'USER' as const, isActive: true }
      : { id: { in: input.userIds }, role: 'USER' as const, isActive: true }
    const eligibleCount = await prisma.user.count({ where: eligibleWhere })
    if (!eligibleCount) return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 })
    if (eligibleCount > MAX_CAMPAIGN_RECIPIENTS) {
      return NextResponse.json({ error: `Campaigns are limited to ${MAX_CAMPAIGN_RECIPIENTS} recipients. Select a smaller audience; no emails were sent.` }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: eligibleWhere,
      select: { id: true, fullName: true, email: true },
      orderBy: { id: 'asc' },
      take: MAX_CAMPAIGN_RECIPIENTS + 1,
    })
    if (users.length > MAX_CAMPAIGN_RECIPIENTS) {
      return NextResponse.json({ error: `The recipient count changed during preparation. Retry with no more than ${MAX_CAMPAIGN_RECIPIENTS} recipients; no emails were sent.` }, { status: 409 })
    }

    const campaignDetails = `audience=${input.audience}; template=${input.template}; subject=${input.template === 'custom' ? input.subject : 'randomized account update'}; recipients=${users.length}`
    await prisma.adminAuditLog.createMany({
      data: users.map(user => ({
        adminId: session.user.id,
        targetUserId: user.id,
        action: 'EMAIL_CAMPAIGN',
        details: campaignDetails,
      })),
    })

    const results: PromiseSettledResult<{ sent: boolean }>[] = []
    for (let index = 0; index < users.length; index += 10) {
      const batch = users.slice(index, index + 10)
      results.push(...await Promise.allSettled(batch.map(user => sendEmail(
        user.email,
        input.template === 'custom' ? customAdminEmail(input.subject!, input.message!) : randomizedCampaignEmail(user.fullName),
      ))))
    }
    const sent = results.filter(result => result.status === 'fulfilled' && result.value.sent).length
    const failed = results.length - sent
    return NextResponse.json({ message: `Campaign processed for ${users.length} recipient(s)`, recipients: users.length, sent, failed, recipientLimit: MAX_CAMPAIGN_RECIPIENTS })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('Admin email error:', error)
    return NextResponse.json({ error: 'Campaign could not be sent' }, { status: 500 })
  }
}
