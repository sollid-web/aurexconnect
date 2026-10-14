import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveAdmin } from '@/lib/server-auth'

const replySchema = z.object({ threadId: z.string().min(1), message: z.string().trim().min(1).max(10000) })
const updateSchema = z.object({ threadId: z.string().min(1), status: z.enum(['OPEN', 'PENDING', 'RESOLVED']).optional(), assignedAdminId: z.string().nullable().optional() })

export async function GET(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const threadId = new URL(req.url).searchParams.get('threadId')
  if (threadId) {
    const thread = await prisma.supportThread.findUnique({ where: { id: threadId }, include: { messages: { orderBy: { createdAt: 'asc' }, include: { support_attachments: true } } } })
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    return NextResponse.json({ thread })
  }
  const threads = await prisma.supportThread.findMany({ orderBy: { lastMessageAt: 'desc' }, take: 100, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } })
  return NextResponse.json({ threads })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid support update' }, { status: 400 })
  const thread = await prisma.supportThread.update({ where: { id: parsed.data.threadId }, data: { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(parsed.data.assignedAdminId !== undefined ? { assignedAdminId: parsed.data.assignedAdminId } : {}) } })
  await prisma.support_audit_logs.create({ data: { id: `status_${thread.id}_${Date.now()}`, threadId: thread.id, actorAdminId: auth.user.id, action: 'UPDATE_SUPPORT_THREAD', details: `${thread.status}` } })
  return NextResponse.json({ thread })
}

export async function POST(req: NextRequest) {
  const auth = await requireActiveAdmin()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = replySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'A reply message is required' }, { status: 400 })
  const thread = await prisma.supportThread.findUnique({ where: { id: parsed.data.threadId }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 50 } } })
  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_SUPPORT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return NextResponse.json({ error: 'Outbound email is not configured' }, { status: 503 })
  const latest = thread.messages.find(message => message.internetMessageId)
  const subject = thread.subject.toLowerCase().startsWith('re:') ? thread.subject : `Re: ${thread.subject}`
  const references = thread.messages.filter(message => message.internetMessageId).map(message => message.internetMessageId).join(' ')
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [thread.senderEmail], subject, text: parsed.data.message, headers: { ...(latest?.internetMessageId ? { 'In-Reply-To': latest.internetMessageId } : {}), ...(references ? { References: references } : {}) } }) })
  const result = await response.json()
  if (!response.ok) return NextResponse.json({ error: result.message || 'Reply could not be sent' }, { status: 502 })
  const message = await prisma.supportMessage.create({ data: { threadId: thread.id, direction: 'OUTBOUND', deliveryStatus: 'SENT', providerEmailId: result.id || null, fromAddress: from, toAddress: thread.senderEmail, emailSubject: subject, textBody: parsed.data.message, inReplyTo: latest?.internetMessageId || null, authorAdminId: auth.user.id } })
  await prisma.supportThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date(), status: 'PENDING' } })
  await prisma.support_audit_logs.create({ data: { id: `reply_${message.id}`, threadId: thread.id, actorAdminId: auth.user.id, action: 'REPLY_SUPPORT_THREAD', details: thread.senderEmail } })
  return NextResponse.json({ message })
}
