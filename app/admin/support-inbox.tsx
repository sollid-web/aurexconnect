'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Download, Loader2, Mail, MessageSquare, RefreshCw, Search, Send, StickyNote, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'

type SupportStatus = 'OPEN' | 'PENDING' | 'RESOLVED'
type SupportAdmin = { id: string; fullName: string; email: string }
type SupportAttachment = { id: string; filename: string; contentType: string | null; size: number | null }
type SupportMessage = {
  id: string
  direction: 'INBOUND' | 'OUTBOUND' | 'NOTE'
  deliveryStatus: 'DELIVERED' | 'QUEUED' | 'SENT' | 'FAILED'
  textBody: string
  idempotencyKey: string | null
  fromAddress: string
  toAddress: string | null
  createdAt: string
  authorAdmin: SupportAdmin | null
  attachments: SupportAttachment[]
}
type SupportThread = {
  id: string
  senderEmail: string
  senderName: string | null
  subject: string
  status: SupportStatus
  assignedAdminId: string | null
  assignedAdmin: SupportAdmin | null
  lastMessageAt: string
  messages: SupportMessage[]
  auditEvents: { id: string; action: string; details: string | null; createdAt: string; actorAdmin: { id: string; fullName: string } | null }[]
}

const statusStyles: Record<SupportStatus, string> = {
  OPEN: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  PENDING: 'bg-blue-400/10 text-blue-300 border-blue-400/20',
  RESOLVED: 'bg-green-400/10 text-green-300 border-green-400/20',
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatBytes(value: number | null) {
  if (value === null) return 'File'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default function SupportInboxTab() {
  const [status, setStatus] = useState<'ALL' | SupportStatus>('ALL')
  const [search, setSearch] = useState('')
  const [threads, setThreads] = useState<SupportThread[]>([])
  const [admins, setAdmins] = useState<SupportAdmin[]>([])
  const [counts, setCounts] = useState({ open: 0, pending: 0, resolved: 0 })
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [thread, setThread] = useState<SupportThread | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<'reply' | 'note'>('reply')
  const [body, setBody] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [draftKeyBody, setDraftKeyBody] = useState('')
  const [sending, setSending] = useState(false)

  const loadThreads = useCallback(async () => {
    setLoadingList(true)
    setError('')
    try {
      const params = new URLSearchParams({ status, page: '1' })
      if (search.trim()) params.set('q', search.trim())
      const response = await fetch(`/api/admin/support?${params}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load the support inbox')
      const nextThreads: SupportThread[] = data.threads || []
      setThreads(nextThreads)
      setAdmins(data.admins || [])
      setCounts(data.counts || { open: 0, pending: 0, resolved: 0 })
      setTotal(data.total || 0)
      if (selectedId && !nextThreads.some(item => item.id === selectedId)) {
        setSelectedId('')
        setThread(null)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the support inbox')
    } finally {
      setLoadingList(false)
    }
  }, [status, search, selectedId])

  const loadThread = useCallback(async (id: string) => {
    if (!id) return
    setLoadingThread(true)
    try {
      const response = await fetch(`/api/admin/support/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load this conversation')
      setThread(data.thread)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not load this conversation')
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadThreads() }, 200)
    return () => window.clearTimeout(timer)
  }, [loadThreads])

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get('threadId')
    if (requestedId) setSelectedId(requestedId)
  }, [])

  useEffect(() => {
    if (selectedId) void loadThread(selectedId)
  }, [selectedId, loadThread])

  const updateThread = async (changes: { status?: SupportStatus; assignedAdminId?: string | null }) => {
    if (!thread) return
    try {
      const response = await fetch(`/api/admin/support/${encodeURIComponent(thread.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
      })
      const data = await response.json()
      if (!response.ok) return toast.error(data.error || 'Could not update this thread')
      toast.success(changes.status ? `Thread marked ${changes.status.toLowerCase()}` : 'Assignment updated')
      await Promise.all([loadThreads(), loadThread(thread.id)])
    } catch {
      toast.error('Could not update this thread')
    }
  }

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!thread || !body.trim()) return
    const requestKey = kind === 'reply' ? (draftKey || crypto.randomUUID()) : undefined
    if (requestKey) { setDraftKey(requestKey); setDraftKeyBody(body.trim()) }
    setSending(true)
    try {
      const response = await fetch(`/api/admin/support/${encodeURIComponent(thread.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, body: body.trim(), ...(requestKey ? { idempotencyKey: requestKey } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) return toast.error(data.error || 'Could not submit the message')
      toast.success(kind === 'reply' ? 'Reply sent' : 'Internal note saved')
      setBody('')
      setDraftKey('')
      setDraftKeyBody('')
      await Promise.all([loadThreads(), loadThread(thread.id)])
    } catch {
      toast.error('Could not submit the message. Retry the same reply to avoid duplicate sends.')
    } finally {
      setSending(false)
    }
  }

  const clearSelection = () => {
    setSelectedId('')
    setThread(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-bold">Support Inbox</h2><p className="text-sm text-gray-500 mt-1">Read and reply to customer emails, assign ownership, and track resolution.</p></div>
        <button type="button" onClick={() => void loadThreads()} className="flex items-center gap-2 rounded-xl border border-[#1e1e35] px-3 py-2 text-sm text-gray-300 hover:text-white"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        {[['Open', counts.open, 'OPEN'], ['Pending', counts.pending, 'PENDING'], ['Resolved', counts.resolved, 'RESOLVED']].map(([label, count, key]) => (
          <button key={key} type="button" onClick={() => setStatus(key as typeof status)} className={`rounded-xl border p-3 text-left ${status === key ? 'border-[#c9a84c]/50 bg-[#c9a84c]/5' : 'border-[#1e1e35] bg-[#12121f]'}`}>
            <span className="block text-xs text-gray-500">{label}</span><span className="text-xl font-bold text-white">{count}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-[650px] xl:grid-cols-[minmax(300px,0.85fr)_minmax(420px,1.4fr)] gap-4">
        <section className={`card-dark overflow-hidden ${selectedId ? 'hidden xl:block' : ''}`} aria-label="Support threads">
          <div className="border-b border-[#1e1e35] p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{status === 'ALL' ? 'All conversations' : `${status[0]}${status.slice(1).toLowerCase()} conversations`}</h3><span className="text-xs text-gray-500">{total} total</span></div>
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search email, subject, message" className="w-full rounded-lg border border-[#1e1e35] bg-[#0a0a14] py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" /></div>
            <div className="flex gap-2"><button type="button" onClick={() => setStatus('ALL')} className={`text-xs rounded-full px-3 py-1.5 ${status === 'ALL' ? 'bg-[#c9a84c]/15 text-[#c9a84c]' : 'bg-[#0a0a14] text-gray-500'}`}>All</button>{(['OPEN', 'PENDING', 'RESOLVED'] as const).map(item => <button key={item} type="button" onClick={() => setStatus(item)} className={`text-xs rounded-full px-3 py-1.5 ${status === item ? 'bg-[#c9a84c]/15 text-[#c9a84c]' : 'bg-[#0a0a14] text-gray-500'}`}>{item[0] + item.slice(1).toLowerCase()}</button>)}</div>
          </div>
          {error ? <div role="alert" className="p-5 text-sm text-red-300">{error}</div> : loadingList ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-[#c9a84c]" /></div> : threads.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No conversations found.</div> : <div className="max-h-[750px] overflow-y-auto divide-y divide-[#1e1e35]">
            {threads.map(item => {
              const preview = item.messages?.[0]
              return <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full p-4 text-left hover:bg-white/[0.03] ${selectedId === item.id ? 'bg-[#c9a84c]/5 border-l-2 border-[#c9a84c]' : ''}`}>
                <div className="flex items-start justify-between gap-2"><span className="truncate text-sm font-semibold text-gray-200">{item.senderName || item.senderEmail}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] ${statusStyles[item.status]}`}>{item.status}</span></div>
                <div className="mt-1 truncate text-xs text-gray-400">{item.subject}</div>
                <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">{preview?.direction === 'NOTE' ? 'Internal note: ' : ''}{preview?.textBody || 'No messages yet'}</div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-gray-600"><span className="truncate">{item.assignedAdmin ? `Assigned to ${item.assignedAdmin.fullName}` : 'Unassigned'}</span><span className="shrink-0">{shortDate(item.lastMessageAt)}</span></div>
              </button>
            })}
          </div>}
        </section>

        <section className={`card-dark flex min-h-[650px] flex-col overflow-hidden ${selectedId ? '' : 'hidden xl:flex'}`} aria-label="Selected support conversation">
          {!selectedId ? <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-500"><Mail size={34} className="mb-3 text-gray-700" /><p className="text-sm">Select a conversation to read and respond.</p></div> : loadingThread || !thread ? <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-[#c9a84c]" /></div> : <>
            <div className="border-b border-[#1e1e35] p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-3"><button type="button" onClick={clearSelection} className="mt-1 rounded-lg border border-[#1e1e35] p-1.5 text-gray-400 hover:text-white xl:hidden" aria-label="Back to inbox"><X size={15} /></button><div className="min-w-0 flex-1"><h3 className="break-words font-bold text-white">{thread.subject}</h3><p className="mt-1 break-all text-xs text-gray-500">{thread.senderName ? `${thread.senderName} · ` : ''}{thread.senderEmail}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${statusStyles[thread.status]}`}>{thread.status}</span></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-500"><UserRound size={13} /> Assign<select value={thread.assignedAdminId || ''} onChange={event => void updateThread({ assignedAdminId: event.target.value || null })} className="rounded-lg border border-[#1e1e35] bg-[#0a0a14] px-2 py-1.5 text-xs text-gray-200"><option value="">Unassigned</option>{admins.map(admin => <option key={admin.id} value={admin.id}>{admin.fullName}</option>)}</select></label>
                {(['OPEN', 'PENDING', 'RESOLVED'] as const).map(value => <button key={value} type="button" onClick={() => void updateThread({ status: value })} disabled={thread.status === value} className="rounded-lg border border-[#1e1e35] px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-white disabled:opacity-40">{value === 'OPEN' ? 'Reopen' : value === 'PENDING' ? 'Mark pending' : 'Resolve'}</button>)}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {thread.messages.map(message => <article key={message.id} className={`rounded-xl border p-4 ${message.direction === 'NOTE' ? 'border-amber-500/25 bg-amber-500/[0.05]' : message.direction === 'OUTBOUND' ? 'border-[#c9a84c]/20 bg-[#c9a84c]/[0.04]' : 'border-[#1e1e35] bg-[#0a0a14]'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${message.direction === 'NOTE' ? 'bg-amber-400/10 text-amber-300' : message.direction === 'OUTBOUND' ? 'bg-[#c9a84c]/10 text-[#c9a84c]' : 'bg-blue-400/10 text-blue-300'}`}>{message.direction === 'NOTE' ? 'Internal note' : message.direction === 'OUTBOUND' ? 'Reply' : 'Customer'}</span><span className="max-w-[260px] truncate text-[10px] text-gray-500">{message.direction === 'NOTE' ? (message.authorAdmin?.fullName || 'Admin') : message.fromAddress}</span></div><time className="text-[10px] text-gray-600">{shortDate(message.createdAt)}</time></div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{message.textBody}</p>
                {message.deliveryStatus === 'FAILED' && <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-xs text-red-300">Email delivery failed.</p><button type="button" onClick={() => { setKind('reply'); setBody(message.textBody); setDraftKey(message.idempotencyKey || ''); setDraftKeyBody(message.textBody) }} className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-400/10">Retry saved reply</button></div>}
                {message.attachments.length > 0 && <div className="mt-4 space-y-2 border-t border-white/5 pt-3">{message.attachments.map(file => <a key={file.id} href={`/api/admin/support/${encodeURIComponent(thread.id)}/attachments/${encodeURIComponent(file.id)}`} className="flex items-center gap-2 rounded-lg border border-[#1e1e35] bg-[#0a0a14] px-3 py-2 text-xs text-gray-300 hover:border-[#c9a84c]/40 hover:text-white"><Download size={13} className="shrink-0 text-[#c9a84c]" /><span className="min-w-0 flex-1 truncate">{file.filename}</span><span className="shrink-0 text-gray-600">{formatBytes(file.size)}</span></a>)}</div>}
              </article>)}
              {thread.auditEvents.length > 0 && <details className="rounded-lg border border-[#1e1e35] bg-[#0a0a14] p-3"><summary className="cursor-pointer text-xs text-gray-500">Recent audit activity ({thread.auditEvents.length})</summary><div className="mt-3 space-y-2">{thread.auditEvents.map(audit => <div key={audit.id} className="flex flex-wrap justify-between gap-2 text-[10px] text-gray-600"><span>{audit.actorAdmin?.fullName || 'System'} · {audit.action.replace(/_/g, ' ').toLowerCase()}{audit.details ? ` · ${audit.details}` : ''}</span><time className="shrink-0">{shortDate(audit.createdAt)}</time></div>)}</div></details>}
            </div>

            <form onSubmit={submitMessage} className="border-t border-[#1e1e35] bg-[#12121f] p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2"><button type="button" onClick={() => { setKind('reply'); setDraftKey(''); setDraftKeyBody('') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${kind === 'reply' ? 'bg-[#c9a84c]/10 text-[#c9a84c]' : 'text-gray-500 hover:text-white'}`}><Send size={13} /> Reply</button><button type="button" onClick={() => { setKind('note'); setDraftKey(''); setDraftKeyBody('') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${kind === 'note' ? 'bg-amber-400/10 text-amber-300' : 'text-gray-500 hover:text-white'}`}><StickyNote size={13} /> Internal note</button></div>
              <textarea required value={body} onChange={event => { const value = event.target.value; setBody(value); if (draftKey && value.trim() !== draftKeyBody) { setDraftKey(''); setDraftKeyBody('') } }} maxLength={20_000} rows={4} placeholder={kind === 'reply' ? 'Write a reply to the customer…' : 'Add a private note visible only to administrators…'} className={`w-full resize-y rounded-xl border bg-[#0a0a14] px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none ${kind === 'note' ? 'border-amber-500/20 focus:border-amber-400/50' : 'border-[#1e1e35] focus:border-[#c9a84c]'}`} />
              <div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-gray-600">{kind === 'reply' ? `Reply sent to ${thread.senderEmail}` : 'Internal notes are never emailed to customers.'}</p><button type="submit" disabled={sending || !body.trim()} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${kind === 'note' ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/20' : 'btn-gold'}`}>{sending ? <Loader2 size={14} className="animate-spin" /> : kind === 'reply' ? <Send size={14} /> : <MessageSquare size={14} />}{sending ? 'Saving…' : kind === 'reply' ? 'Send reply' : 'Add note'}</button></div>
            </form>
          </>}
        </section>
      </div>
    </div>
  )
}
