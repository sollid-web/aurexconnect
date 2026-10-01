import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { customAdminEmail, randomizedCampaignEmail, sendEmail } from '@/lib/email'
import { z } from 'zod'

const emailSchema = z.object({
  audience: z.enum(['all', 'selected']),
  userIds: z.array(z.string()).max(500).default([]),
  template: z.enum(['random', 'custom']).default('random'),
  subject: z.string().trim().min(3).max(160).optional(),
  message: z.string().trim().min(10).max(5000).optional(),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await prisma.user.findMany({ where: { role: 'USER', isActive: true }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: 'asc' } })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const input = emailSchema.parse(await req.json())
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
    return NextResponse.json({ message: `Campaign processed for ${users.length} recipient(s)`, recipients: users.length, sent, failed })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('Admin email error:', error)
    return NextResponse.json({ error: 'Campaign could not be sent' }, { status: 500 })
  }
}
