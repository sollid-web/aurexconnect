import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseName(from: string) {
  const match = from.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/)
  return match?.[1]?.trim() || null
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 })
  const payload = await req.text()
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 })

  let event: any
  try {
    event = new Webhook(secret).verify(payload, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature })
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }
  if (event?.type !== 'email.received') return NextResponse.json({ received: true })

  const data = event.data || {}
  const providerEmailId = String(data.email_id || '')
  if (!providerEmailId) return NextResponse.json({ error: 'Missing received email id' }, { status: 400 })
  const duplicate = await prisma.supportMessage.findFirst({ where: { OR: [{ providerEmailId }, { idempotencyKey: svixId }] }, select: { id: true } })
  if (duplicate) return NextResponse.json({ received: true, duplicate: true })

  const apiKey = process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Resend API key is not configured' }, { status: 503 })
  const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(providerEmailId)}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' })
  if (!emailResponse.ok) return NextResponse.json({ error: 'Unable to retrieve received email' }, { status: 502 })
  const email = await emailResponse.json()
  const fromAddress = String(data.from || email.from || '').trim().toLowerCase()
  const toAddress = Array.isArray(data.to) ? data.to.join(', ') : String(data.to || email.to?.[0] || '')
  const subject = String(data.subject || email.subject || '(No subject)').slice(0, 500)
  const internetMessageId = email.message_id || data.message_id || null
  const inReplyTo = email.in_reply_to || null
  const existingThread = inReplyTo ? await prisma.supportThread.findFirst({ where: { senderEmail: fromAddress, messages: { some: { internetMessageId: inReplyTo } } } }) : null
  const thread = existingThread || await prisma.supportThread.findFirst({ where: { senderEmail: fromAddress, status: { not: 'RESOLVED' } }, orderBy: { updatedAt: 'desc' } })

  await prisma.$transaction(async db => {
    const createdThread = thread || await db.supportThread.create({ data: { senderEmail: fromAddress, senderName: parseName(String(data.from || email.from || '')), subject } })
    const message = await db.supportMessage.create({ data: { threadId: createdThread.id, direction: 'INBOUND', deliveryStatus: 'DELIVERED', providerEmailId, idempotencyKey: svixId, fromAddress, toAddress, emailSubject: subject, internetMessageId, inReplyTo, textBody: String(email.text || email.html || ''), replyHeaders: email.headers || undefined } })
    for (const attachment of Array.isArray(email.attachments) ? email.attachments : []) {
      await db.support_attachments.create({ data: { id: `${message.id}_${attachment.id}`, messageId: message.id, providerAttachmentId: String(attachment.id), filename: String(attachment.filename || 'attachment'), contentType: attachment.content_type || null, contentDisposition: attachment.content_disposition || null, contentId: attachment.content_id || null, size: attachment.size || null } })
    }
    await db.supportThread.update({ where: { id: createdThread.id }, data: { lastMessageAt: new Date(), status: 'OPEN', subject } })
    await db.support_audit_logs.create({ data: { id: `inbound_${svixId}`, threadId: createdThread.id, action: 'INBOUND_EMAIL_RECEIVED', details: `${fromAddress} · ${subject}` } })
  })
  return NextResponse.json({ received: true })
}
