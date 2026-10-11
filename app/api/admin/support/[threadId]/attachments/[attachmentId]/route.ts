import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resendApiKey } from '@/lib/support-inbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'ADMIN' && session.user.isActive ? session : null
}

function safeFilename(value: string) {
  const cleaned = value.replace(/[\r\n\u0000-\u001f\u007f"\\/]/g, '_').trim().slice(0, 180)
  return cleaned || 'support-attachment'
}

export async function GET(_req: NextRequest, context: { params: { threadId: string; attachmentId: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const attachment = await prisma.supportAttachment.findFirst({
    where: { id: context.params.attachmentId, message: { threadId: context.params.threadId, direction: 'INBOUND' } },
    include: { message: { select: { providerEmailId: true } } },
  })
  if (!attachment?.message.providerEmailId) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  if (attachment.size !== null && attachment.size > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: 'Attachment exceeds the 20 MB download limit' }, { status: 413 })

  const apiKey = resendApiKey()
  if (!apiKey) return NextResponse.json({ error: 'Resend inbound API key is not configured' }, { status: 503 })

  try {
    const listResponse = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(attachment.message.providerEmailId)}/attachments`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!listResponse.ok) return NextResponse.json({ error: 'Could not retrieve the attachment download link' }, { status: 502 })
    const attachmentList = await listResponse.json()
    const remote = Array.isArray(attachmentList?.data) ? attachmentList.data.find((item: any) => item?.id === attachment.providerAttachmentId) : null
    if (!remote || typeof remote.download_url !== 'string') return NextResponse.json({ error: 'Attachment is no longer available from the email provider' }, { status: 404 })

    const downloadUrl = new URL(remote.download_url)
    if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'inbound-cdn.resend.com') {
      return NextResponse.json({ error: 'Unexpected attachment download host' }, { status: 502 })
    }
    if (typeof remote.size === 'number' && remote.size > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: 'Attachment exceeds the 20 MB download limit' }, { status: 413 })

    const downloadResponse = await fetch(downloadUrl, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000) })
    if (!downloadResponse.ok) return NextResponse.json({ error: 'Could not download the attachment' }, { status: 502 })
    const declaredLength = Number(downloadResponse.headers.get('content-length') || 0)
    if (declaredLength > MAX_ATTACHMENT_BYTES) return NextResponse.json({ error: 'Attachment exceeds the 20 MB download limit' }, { status: 413 })
    if (!downloadResponse.body) return NextResponse.json({ error: 'Attachment download returned no content' }, { status: 502 })
    const reader = downloadResponse.body.getReader()
    const chunks: Uint8Array[] = []
    let downloadedBytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      downloadedBytes += value.byteLength
      if (downloadedBytes > MAX_ATTACHMENT_BYTES) {
        await reader.cancel().catch(() => undefined)
        return NextResponse.json({ error: 'Attachment exceeds the 20 MB download limit' }, { status: 413 })
      }
      chunks.push(value)
    }
    const buffer = Buffer.concat(chunks, downloadedBytes)

    const filename = safeFilename(attachment.filename)
    const contentType = attachment.contentType && /^[\w.+-]+\/[\w.+-]+$/.test(attachment.contentType) ? attachment.contentType : 'application/octet-stream'
    await prisma.supportAuditLog.create({ data: { threadId: context.params.threadId, actorAdminId: session.user.id, action: 'ATTACHMENT_DOWNLOADED', details: `attachmentId=${attachment.id}; filename=${filename}` } })
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(downloadedBytes),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[Admin support attachment]', error)
    return NextResponse.json({ error: 'Could not download the attachment' }, { status: 502 })
  }
}
