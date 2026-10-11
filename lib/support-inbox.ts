export type ReceivedEmail = {
  id: string
  from: string
  to: string[]
  cc?: string[]
  subject?: string | null
  created_at?: string
  text?: string | null
  html?: string | null
  headers?: Record<string, string | string[] | undefined> | null
  message_id?: string | null
  attachments?: Array<{
    id: string
    filename?: string | null
    content_type?: string | null
    content_disposition?: string | null
    content_id?: string | null
    size?: number | null
  }> | null
}

export function supportInboxAddress() {
  return (process.env.SUPPORT_INBOUND_ADDRESS || 'support@inbox.aurexconnect.site').trim().toLowerCase()
}

export function resendApiKey() {
  return process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY || ''
}

export function headerValue(headers: ReceivedEmail['headers'], name: string) {
  if (!headers) return ''
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name.toLowerCase())
  if (!key) return ''
  const value = headers[key]
  return Array.isArray(value) ? value.join(' ') : value || ''
}

export function messageIds(value: string) {
  return Array.from(value.matchAll(/<[^<>\s]+>/g), match => match[0]).slice(0, 50)
}

export function mailboxAddress(value: string) {
  const bracketed = value.match(/<([^<>]+)>/)
  const email = (bracketed?.[1] || value).trim().toLowerCase()
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : ''
}

export function mailboxName(value: string) {
  const bracketed = value.match(/^\s*([^<>]+?)\s*<[^<>]+>\s*$/)
  return (bracketed?.[1] || '').trim().replace(/^['"]|['"]$/g, '').slice(0, 160)
}

export function htmlToPlainText(html: string) {
  const decodeCodePoint = (value: number) => {
    if (!Number.isInteger(value) || value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) return '\uFFFD'
    return String.fromCodePoint(value)
  }
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(br|hr)\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => decodeCodePoint(parseInt(code, 16)))
    .replace(/[\t\f\v ]+\n/g, '\n')
    .replace(/\n[\t ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 100_000)
}

export async function retrieveReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const apiKey = resendApiKey()
  if (!apiKey) throw new Error('Resend inbound API key is not configured')
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const error = await response.text().catch(() => '')
    console.error('[Support inbox] Resend retrieve failed', response.status, error.slice(0, 300))
    throw new Error(`Resend received-email retrieval failed (${response.status})`)
  }
  const email = await response.json() as ReceivedEmail
  if (!email || email.id !== emailId || typeof email.from !== 'string' || !Array.isArray(email.to)) {
    throw new Error('Resend returned an invalid received-email response')
  }
  return email
}
