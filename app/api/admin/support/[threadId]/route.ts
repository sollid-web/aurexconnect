import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

const updateSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'RESOLVED']).optional(),
  assignedAdminId: z.string().min(1).max(128).nullable().optional(),
}).strict().refine(input => Object.keys(input).length > 0, 'Provide a status or assignment change')

const messageSchema = z.object({
  kind: z.enum(['reply', 'note']),
  body: z.string().trim().min(1).max(20_000),
  idempotencyKey: z.string().min(1).max(256).optional(),
}).strict().superRefine((input, ctx) => {
  if (input.kind === 'reply' && !input.idempotencyKey) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['idempotencyKey'], message: 'A reply idempotency key is required' })
  }
})

export async function GET(_req: NextRequest, context: { params: { threadId: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const thread = await prisma.supportThread.findUnique({
      where: { id: context.params.threadId },
      include: {
        assignedAdmin: { select: { id: true, fullName: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
          include: {
            authorAdmin: { select: { id: true, fullName: true, email: true } },
            attachments: { orderBy: { filename: 'asc' } },
          },
        },
        auditEvents: { orderBy: { createdAt: 'desc' }, take: 50, include: { actorAdmin: { select: { id: true, fullName: true } } } },
      },
    })
    if (!thread) return NextResponse.json({ error: 'Support thread not found' }, { status: 404 })
    return NextResponse.json({ thread })
  } catch (error) {
    console.error('[Admin support thread]', error)
    return NextResponse.json({ error: 'Could not load this support thread' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: { params: { threadId: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = updateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid support update' }, { status: 400 })
  const input = parsed.data

  if (input.assignedAdminId) {
    const admin = await prisma.user.findFirst({ where: { id: input.assignedAdminId, role: 'ADMIN', isActive: true }, select: { id: true } })
    if (!admin) return NextResponse.json({ error: 'Assignment must be to an active administrator' }, { status: 400 })
  }

  try {
    const thread = await prisma.$transaction(async db => {
      const existing = await db.supportThread.findUnique({ where: { id: context.params.threadId }, select: { id: true, status: true, assignedAdminId: true } })
      if (!existing) return null
      const updated = await db.supportThread.update({ where: { id: existing.id }, data: input })
      if (input.status && input.status !== existing.status) {
        await db.supportAuditLog.create({ data: { threadId: existing.id, actorAdminId: session.user.id, action: 'STATUS_CHANGED', details: `from=${existing.status}; to=${input.status}` } })
      }
      if (Object.prototype.hasOwnProperty.call(input, 'assignedAdminId') && input.assignedAdminId !== existing.assignedAdminId) {
        await db.supportAuditLog.create({ data: { threadId: existing.id, actorAdminId: session.user.id, action: 'ASSIGNMENT_CHANGED', details: `from=${existing.assignedAdminId || 'unassigned'}; to=${input.assignedAdminId || 'unassigned'}` } })
        if (input.assignedAdminId) {
          await db.notification.create({ data: { userId: input.assignedAdminId, title: 'Support thread assigned', message: `A support thread was assigned to you: ${updated.subject.slice(0, 120)}`, type: 'info', link: `/admin?tab=support&threadId=${encodeURIComponent(existing.id)}` } })
        }
      }
      return updated
    })
    if (!thread) return NextResponse.json({ error: 'Support thread not found' }, { status: 404 })
    return NextResponse.json({ thread })
  } catch (error) {
    console.error('[Admin support update]', error)
    return NextResponse.json({ error: 'Could not update this support thread' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: { params: { threadId: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = messageSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid support message' }, { status: 400 })
  const input = parsed.data

  const thread = await prisma.supportThread.findUnique({ where: { id: context.params.threadId }, include: { messages: { where: { direction: 'INBOUND' }, orderBy: { createdAt: 'asc' }, select: { internetMessageId: true, createdAt: true } } } })
  if (!thread) return NextResponse.json({ error: 'Support thread not found' }, { status: 404 })

  if (input.kind === 'note') {
    try {
      const message = await prisma.$transaction(async db => {
        const created = await db.supportMessage.create({ data: { threadId: thread.id, direction: 'NOTE', deliveryStatus: 'DELIVERED', fromAddress: session.user.email || 'admin', textBody: input.body, authorAdminId: session.user.id } })
        await db.supportThread.update({ where: { id: thread.id }, data: { lastMessageAt: created.createdAt } })
        await db.supportAuditLog.create({ data: { threadId: thread.id, actorAdminId: session.user.id, action: 'INTERNAL_NOTE_ADDED', details: `messageId=${created.id}` } })
        return created
      })
      return NextResponse.json({ message }, { status: 201 })
    } catch (error) {
      console.error('[Admin support note]', error)
      return NextResponse.json({ error: 'Could not save the internal note' }, { status: 500 })
    }
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.SUPPORT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return NextResponse.json({ error: 'Resend sending credentials or SUPPORT_FROM_EMAIL are not configured' }, { status: 503 })
  const idempotencyKey = input.idempotencyKey!
  const references = thread.messages.map(item => item.internetMessageId).filter((value): value is string => Boolean(value))
  const latestMessageId = references.length ? references[references.length - 1] : undefined
  const replyHeaders = latestMessageId ? { 'In-Reply-To': latestMessageId, References: Array.from(new Set(references)).join(' ') } : null
  const subject = /^re\s*:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`

  let message
  try {
    const existing = await prisma.supportMessage.findUnique({ where: { idempotencyKey } })
    if (existing) {
      if (existing.threadId !== thread.id || existing.textBody !== input.body || existing.direction !== 'OUTBOUND') {
        return NextResponse.json({ error: 'This reply key was already used for a different request' }, { status: 409 })
      }
      if (existing.deliveryStatus === 'SENT') return NextResponse.json({ message: existing, duplicate: true })
      message = await prisma.supportMessage.update({ where: { id: existing.id }, data: { deliveryStatus: 'QUEUED' } })
    } else {
      message = await prisma.$transaction(async db => {
        const created = await db.supportMessage.create({
          data: { threadId: thread.id, direction: 'OUTBOUND', deliveryStatus: 'QUEUED', idempotencyKey, fromAddress: from, toAddress: thread.senderEmail, emailSubject: subject, replyHeaders: replyHeaders || undefined, textBody: input.body, authorAdminId: session.user.id },
        })
        await db.supportAuditLog.create({ data: { threadId: thread.id, actorAdminId: session.user.id, action: 'REPLY_QUEUED', details: `messageId=${created.id}` } })
        return created
      })
    }
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'This reply is already being processed. Refresh the thread before retrying.' }, { status: 409 })
    console.error('[Admin support reply prepare]', error)
    return NextResponse.json({ error: 'Could not prepare this reply' }, { status: 500 })
  }

  try {
    const headers = message.replyHeaders && typeof message.replyHeaders === 'object' && !Array.isArray(message.replyHeaders)
      ? message.replyHeaders as Record<string, string>
      : undefined
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from: message.fromAddress, to: [message.toAddress || thread.senderEmail], subject: message.emailSubject || subject, text: message.textBody, ...(headers ? { headers } : {}) }),
      signal: AbortSignal.timeout(15_000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || typeof result?.id !== 'string') {
      console.error('[Admin support reply] Resend send failed', response.status)
      await prisma.$transaction(async db => {
        await db.supportMessage.update({ where: { id: message.id }, data: { deliveryStatus: 'FAILED' } })
        await db.supportAuditLog.create({ data: { threadId: thread.id, actorAdminId: session.user.id, action: 'REPLY_FAILED', details: `messageId=${message.id}; status=${response.status}` } })
      })
      return NextResponse.json({ error: 'Resend could not send the reply. The draft is preserved; retry the same action.' }, { status: 502 })
    }

    const sentMessage = await prisma.$transaction(async db => {
      const updated = await db.supportMessage.update({ where: { id: message.id }, data: { deliveryStatus: 'SENT', providerEmailId: result.id } })
      await db.supportThread.update({ where: { id: thread.id }, data: { status: 'PENDING', lastMessageAt: updated.createdAt } })
      await db.supportAuditLog.create({ data: { threadId: thread.id, actorAdminId: session.user.id, action: 'REPLY_SENT', details: `messageId=${updated.id}; providerEmailId=${result.id}` } })
      return updated
    })
    return NextResponse.json({ message: sentMessage }, { status: 201 })
  } catch (error) {
    console.error('[Admin support reply]', error)
    await prisma.supportMessage.update({ where: { id: message.id }, data: { deliveryStatus: 'FAILED' } }).catch(() => undefined)
    return NextResponse.json({ error: 'Could not send the reply. Retry using the same request key.' }, { status: 502 })
  }
}
