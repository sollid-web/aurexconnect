import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { headerValue, htmlToPlainText, mailboxAddress, mailboxName, messageIds, retrieveReceivedEmail, supportInboxAddress } from '@/lib/support-inbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const inboundEventSchema = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string().min(1).max(200),
    message_id: z.string().max(998).optional().nullable(),
    from: z.string().min(3).max(500),
    to: z.array(z.string().max(500)).max(100).default([]),
    received_for: z.array(z.string().max(500)).max(100).optional().default([]),
    subject: z.string().max(998).optional().nullable(),
  }).passthrough(),
}).passthrough()

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook verification is not configured' }, { status: 503 })

  const maxPayloadBytes = 256_000
  const declaredLength = Number(req.headers.get('content-length') || 0)
  if (declaredLength > maxPayloadBytes) return NextResponse.json({ error: 'Webhook payload is too large' }, { status: 413 })
  if (!req.body) return NextResponse.json({ error: 'Missing webhook payload' }, { status: 400 })
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let payloadBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    payloadBytes += value.byteLength
    if (payloadBytes > maxPayloadBytes) {
      await reader.cancel().catch(() => undefined)
      return NextResponse.json({ error: 'Webhook payload is too large' }, { status: 413 })
    }
    chunks.push(value)
  }
  let rawBody: string
  try {
    rawBody = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, payloadBytes))
  } catch {
    return NextResponse.json({ error: 'Webhook payload is not valid UTF-8' }, { status: 400 })
  }

  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signature = req.headers.get('svix-signature')
  if (!id || !timestamp || !signature) return NextResponse.json({ error: 'Missing webhook signature headers' }, { status: 400 })

  let rawEvent: unknown
  try {
    rawEvent = new Webhook(secret).verify(rawBody, { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature })
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const parsed = inboundEventSchema.safeParse(rawEvent)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
  if (parsed.data.type !== 'email.received') return NextResponse.json({ received: true, ignored: true })

  const event = parsed.data.data
  const inbox = supportInboxAddress()
  const deliveredAddresses = [...event.received_for, ...event.to].map(mailboxAddress).filter(Boolean)
  if (!deliveredAddresses.includes(inbox)) return NextResponse.json({ received: true, ignored: true })

  try {
    const email = await retrieveReceivedEmail(event.email_id)
    const senderEmail = mailboxAddress(email.from || event.from)
    if (!senderEmail) return NextResponse.json({ received: true, ignored: true, reason: 'invalid_sender' })

    const internetMessageId = (email.message_id || event.message_id || '').trim().slice(0, 998) || null
    const inReplyTo = headerValue(email.headers, 'in-reply-to').slice(0, 998) || null
    const references = Array.from(new Set([...messageIds(headerValue(email.headers, 'references')), ...messageIds(inReplyTo || '')]))
    const textBody = (email.text?.trim() || htmlToPlainText(email.html || '')).slice(0, 100_000)
    const attachments = (email.attachments || []).filter(item => typeof item.id === 'string' && item.id.length > 0).slice(0, 50)
    const senderName = mailboxName(headerValue(email.headers, 'from')) || mailboxName(email.from) || null
    const subject = (email.subject || event.subject || '(no subject)').trim().slice(0, 998)
    const messageDate = email.created_at && Number.isFinite(Date.parse(email.created_at)) ? new Date(email.created_at) : new Date()
    const receivedAt = new Date()

    await prisma.$transaction(async db => {
      const duplicate = await db.supportMessage.findUnique({ where: { providerEmailId: email.id }, select: { id: true } })
      if (duplicate) return

      const parent = references.length ? await db.supportMessage.findFirst({
        where: { internetMessageId: { in: references }, thread: { senderEmail: { equals: senderEmail, mode: 'insensitive' } } },
        select: { threadId: true },
        orderBy: { createdAt: 'asc' },
      }) : null

      const thread = parent
        ? await db.supportThread.update({
            where: { id: parent.threadId },
            data: { status: 'OPEN', lastMessageAt: receivedAt },
          })
        : await db.supportThread.create({
            data: { senderEmail, senderName, subject, status: 'OPEN', lastMessageAt: receivedAt },
          })

      const message = await db.supportMessage.create({
        data: {
          threadId: thread.id,
          direction: 'INBOUND',
          deliveryStatus: 'DELIVERED',
          providerEmailId: email.id,
          internetMessageId,
          inReplyTo,
          fromAddress: senderEmail,
          toAddress: inbox,
          textBody: textBody || '(This email did not contain readable text.)',
          createdAt: messageDate,
          attachments: attachments.length ? {
            create: attachments.map(item => ({
              providerAttachmentId: item.id,
              filename: (item.filename || 'attachment').slice(0, 255),
              contentType: item.content_type?.slice(0, 200) || null,
              contentDisposition: item.content_disposition?.slice(0, 100) || null,
              contentId: item.content_id?.slice(0, 500) || null,
              size: typeof item.size === 'number' && Number.isSafeInteger(item.size) && item.size >= 0 ? item.size : null,
            })),
          } : undefined,
        },
      })

      await db.supportAuditLog.create({
        data: { threadId: thread.id, action: 'INBOUND_MESSAGE_RECEIVED', details: `messageId=${message.id}; providerEmailId=${email.id}` },
      })

      const admins = await db.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } })
      if (admins.length) {
        await db.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: 'New support email',
            message: `${senderEmail}: ${subject.slice(0, 120)}`,
            type: 'info',
            link: `/admin?tab=support&threadId=${encodeURIComponent(thread.id)}`,
          })),
        })
      }
    })
    return NextResponse.json({ received: true })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const duplicate = await prisma.supportMessage.findUnique({ where: { providerEmailId: event.email_id }, select: { id: true } }).catch(() => null)
      if (duplicate) return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('[Resend inbound webhook]', error)
    return NextResponse.json({ error: 'Could not process inbound email; Resend may retry this event' }, { status: 500 })
  }
}
