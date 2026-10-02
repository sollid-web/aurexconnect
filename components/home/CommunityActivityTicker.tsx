'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, TrendingUp, X } from 'lucide-react'

type ActivityEvent = {
  id: string
  label: string
  name: string
  country: string | null
  amount: number
  currency: string
  type: string
  createdAt: string
}

type ActivityResponse = {
  available: boolean
  source?: 'live'
  events: ActivityEvent[]
}

const PUBLIC_PAGES = new Set(['/', '/about', '/our-team', '/policies', '/investment-plans'])

function EventIcon({ type }: { type: string }) {
  if (type === 'DEPOSIT') return <ArrowDownLeft size={14} className="text-blue-300" />
  if (type === 'WITHDRAWAL') return <ArrowUpRight size={14} className="text-orange-300" />
  if (type === 'PROFIT') return <TrendingUp size={14} className="text-emerald-300" />
  return <CheckCircle2 size={14} className="text-[#c9a84c]" />
}

function relativeTime(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} mins ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function nextDelay(initial = false) {
  return initial ? 7_000 + Math.floor(Math.random() * 8_000) : 16_000 + Math.floor(Math.random() * 20_000)
}

export default function CommunityActivityTicker() {
  const pathname = usePathname()
  const [event, setEvent] = useState<ActivityEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const eventsRef = useRef<ActivityEvent[]>([])
  const lastEventId = useRef<string | null>(null)

  useEffect(() => {
    if (!PUBLIC_PAGES.has(pathname)) {
      setVisible(false)
      setEvent(null)
      return
    }

    let active = true
    let timer: number | undefined

    const showNext = (initial = false) => {
      const candidates = eventsRef.current.filter(item => item.id !== lastEventId.current)
      if (!active || candidates.length === 0) return
      const next = candidates[Math.floor(Math.random() * candidates.length)]
      lastEventId.current = next.id
      setEvent(next)
      setVisible(true)
      timer = window.setTimeout(() => {
        setVisible(false)
        timer = window.setTimeout(() => showNext(), nextDelay())
      }, 7_000)
      if (initial) return
    }

    const load = async () => {
      try {
        const response = await fetch('/api/public/activity', { cache: 'no-store' })
        const data: ActivityResponse = await response.json()
        if (!active || data.source !== 'live' || !data.events?.length) return
        eventsRef.current = data.events
        timer = window.setTimeout(() => showNext(true), nextDelay(true))
      } catch {
        // Activity is optional. Do not show generated or misleading fallback content.
      }
    }

    load()
    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [pathname])

  if (!PUBLIC_PAGES.has(pathname) || !visible || !event) return null

  return (
    <aside className="pointer-events-none fixed bottom-4 left-4 z-40 w-[calc(100vw-2rem)] max-w-[19rem] animate-[fadeUp_0.35s_ease-out]" aria-live="polite">
      <div className="pointer-events-auto rounded-xl border border-white/10 bg-[#12121f]/95 px-3 py-2.5 shadow-xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/5"><EventIcon type={event.type} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] leading-tight text-gray-200"><span className="truncate font-semibold">{event.name}</span><span className="text-gray-600">·</span><span className="truncate text-gray-400">{event.country || 'Global'}</span></div>
            <div className="mt-0.5 truncate text-[11px] text-gray-500">{event.label} · {relativeTime(event.createdAt)}</div>
          </div>
          <button onClick={() => setVisible(false)} aria-label="Dismiss activity" className="flex-shrink-0 text-gray-600 transition-colors hover:text-white"><X size={14} /></button>
        </div>
      </div>
    </aside>
  )
}
