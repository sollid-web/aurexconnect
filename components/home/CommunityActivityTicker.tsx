'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, BriefcaseBusiness, ChevronRight, Sparkles, X } from 'lucide-react'

const NAMES = [
  'Olivia Carter', 'James Wilson', 'Amelia Brooks', 'Noah Bennett', 'Sophia Turner',
  'Liam Mitchell', 'Mia Anderson', 'Ethan Parker', 'Ava Thompson', 'Lucas Morgan',
  'Isabella Reed', 'Mason Cooper', 'Ella Richardson', 'Henry Bailey', 'Grace Collins',
  'Daniel Foster', 'Chloe Ward', 'Benjamin Hughes', 'Lily Peterson', 'Samuel Hayes',
]

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Switzerland', 'Singapore', 'South Africa', 'Nigeria', 'United Arab Emirates', 'Netherlands', 'Ireland', 'New Zealand', 'Norway']
const PLANS = ['Gold Plan', 'Silver Plan', 'Bronze Plan', 'Diamond Plan']
const AMOUNTS = [250, 500, 750, 1000, 1500, 2500, 5000, 10000]
const ACTIONS = ['migrated', 'deposited', 'withdrew', 'started', 'invested'] as const

type Activity = {
  id: string
  name: string
  country: string
  action: typeof ACTIONS[number]
  plan: string
  amount: number
  message: string
}

function buildActivities(): Activity[] {
  return Array.from({ length: 100 }, (_, index) => {
    const name = NAMES[index % NAMES.length]
    const country = COUNTRIES[(index * 3) % COUNTRIES.length]
    const plan = PLANS[index % PLANS.length]
    const amount = AMOUNTS[(index * 5) % AMOUNTS.length]
    const action = ACTIONS[index % ACTIONS.length]
    const messages = {
      migrated: `${name} from ${country} just migrated to the ${plan}`,
      deposited: `${name} from ${country} just deposited ${formatAmount(amount)}`,
      withdrew: `${name} from ${country} just withdrew ${formatAmount(amount)}`,
      started: `${name} from ${country} started with ${formatAmount(amount)}`,
      invested: `${name} from ${country} just invested ${formatAmount(amount)} in the ${plan}`,
    }
    return { id: `community-${index + 1}`, name, country, action, plan, amount, message: messages[action] }
  })
}

function formatAmount(amount: number) {
  return `$${amount.toLocaleString('en-US')}`
}

function ActivityIcon({ action }: { action: Activity['action'] }) {
  if (action === 'deposited' || action === 'started') return <ArrowDownLeft size={16} className="text-blue-300" />
  if (action === 'withdrew') return <ArrowUpRight size={16} className="text-orange-300" />
  if (action === 'migrated') return <ChevronRight size={16} className="text-[#c9a84c]" />
  return <BriefcaseBusiness size={16} className="text-emerald-300" />
}

export default function CommunityActivityTicker() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)
  const activities = useMemo(buildActivities, [])
  const isPublicPage = pathname === '/' || pathname === '/about' || pathname === '/our-team' || pathname === '/policies' || pathname === '/investment-plans'

  useEffect(() => {
    if (!isPublicPage) {
      setVisible(false)
      return
    }
    setVisible(false)
    setIndex(Math.floor(Math.random() * activities.length))
    const firstTimer = window.setTimeout(() => setVisible(true), 7000)
    return () => window.clearTimeout(firstTimer)
  }, [activities.length, isPublicPage, pathname])

  useEffect(() => {
    if (!visible || !isPublicPage) return
    const timer = window.setTimeout(() => {
      setIndex(current => (current + 1 + Math.floor(Math.random() * (activities.length - 1))) % activities.length)
    }, 18000 + Math.floor(Math.random() * 14000))
    return () => window.clearTimeout(timer)
  }, [activities.length, index, isPublicPage, visible])

  if (!isPublicPage || !visible) return null
  const activity = activities[index]

  return (
    <aside className="fixed bottom-5 left-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm animate-[fadeUp_0.45s_ease-out]" aria-live="polite">
      <div className="rounded-2xl border border-[#c9a84c]/35 bg-[#12121f]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/10"><ActivityIcon action={activity.action} /></div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#c9a84c]"><Sparkles size={12} /> Community activity preview</div>
            <p className="text-sm leading-relaxed text-gray-200">{activity.message}</p>
            <p className="mt-1.5 text-[10px] text-gray-500">Generic example · not attributed to a real transaction</p>
          </div>
          <button onClick={() => setVisible(false)} aria-label="Close activity preview" className="text-gray-600 transition-colors hover:text-white"><X size={15} /></button>
        </div>
      </div>
    </aside>
  )
}
