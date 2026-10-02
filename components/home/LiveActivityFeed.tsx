'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3, TrendingUp, Users } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

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
  updatedAt?: string
  metrics: { transactionsLast24h: number; volumeLast24h: number; activeInvestments: number } | null
  events: ActivityEvent[]
}

function EventIcon({ type }: { type: string }) {
  if (type === 'DEPOSIT') return <ArrowDownLeft size={16} className="text-blue-300" />
  if (type === 'WITHDRAWAL') return <ArrowUpRight size={16} className="text-orange-300" />
  if (type === 'PROFIT') return <TrendingUp size={16} className="text-emerald-300" />
  return <CheckCircle2 size={16} className="text-[#c9a84c]" />
}

export default function LiveActivityFeed() {
  const [data, setData] = useState<ActivityResponse | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/public/activity', { cache: 'no-store' })
        const next = await response.json()
        if (active) setData(next)
      } catch {
        if (active) setData({ available: false, source: 'live', metrics: null, events: [] })
      }
    }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const metrics = data?.metrics
  const isLive = data?.available && data.source === 'live'
  return (
    <section className="py-20 bg-[#0d0d19] border-y border-[#1e1e35]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-3">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" /></span>
              Network pulse
            </div>
            <h2 className="text-3xl md:text-4xl font-black">Community activity, <span className="gold-text">in motion</span></h2>
            <p className="text-gray-500 mt-3 max-w-2xl text-sm leading-relaxed">{isLive ? 'A privacy-safe view of completed platform transactions. Names are anonymized, and activity only appears after a transaction reaches an approved or completed state.' : 'Completed platform activity will appear here as verified transactions are recorded.'}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 size={14} /> Updates every 30 seconds</div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Verified events · 24h', value: metrics ? metrics.transactionsLast24h.toLocaleString() : '—', icon: Activity },
            { label: 'Recorded volume · 24h', value: metrics ? formatCurrency(metrics.volumeLast24h) : '—', icon: TrendingUp },
            { label: 'Active investments', value: metrics ? metrics.activeInvestments.toLocaleString() : '—', icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-[#1e1e35] bg-[#12121f] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center"><Icon size={17} className="text-[#c9a84c]" /></div>
              <div><div className="font-bold text-lg">{value}</div><div className="text-[11px] text-gray-500">{label}</div></div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#1e1e35] bg-[#12121f] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e35] flex items-center justify-between gap-3">
            <div><h3 className="font-bold">Recent verified activity</h3><p className="text-xs text-gray-500 mt-1">Last 7 days · anonymized for investor privacy</p></div>
            <div className="text-[10px] border rounded-full px-2.5 py-1 text-emerald-300 border-emerald-400/20 bg-emerald-400/5">LIVE DATA</div>
          </div>
          {data?.events?.length ? (
            <div className="divide-y divide-[#1e1e35]">
              {data.events.map(event => (
                <div key={event.id} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0"><EventIcon type={event.type} /></div>
                  <div className="min-w-0 flex-1"><div className="text-sm text-gray-200 truncate"><span className="font-semibold">{event.name}</span> {event.label}</div><div className="text-xs text-gray-500 mt-1">{event.country ? `${event.country} · ` : ''}{formatDate(event.createdAt)}</div></div>
                  <div className="text-right flex-shrink-0"><div className="font-bold text-sm text-white">{formatCurrency(event.amount)}</div><div className="text-[10px] uppercase tracking-wide text-emerald-300">verified</div></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center"><Activity size={28} className="mx-auto mb-3 text-gray-600" /><p className="text-sm text-gray-400">Verified activity will appear here as transactions complete.</p><p className="text-xs text-gray-600 mt-2">No synthetic or example transactions are displayed.</p></div>
          )}
        </div>
      </div>
    </section>
  )
}
