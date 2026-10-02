'use client'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { DollarSign, TrendingUp, ArrowUpCircle, ArrowDownCircle, Clock, Copy, CheckCircle, ShieldCheck, MailCheck, Wallet, Activity, CalendarClock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

interface UserData { email: string; fullName: string; balance: number; totalDeposited: number; totalProfit: number; totalWithdrawn: number; referralCode: string; investments: any[]; transactions: any[] }
interface PortfolioData { summary: any; health: any; performance: any[]; allocation: any[]; nextPayout: { amount: number; at: string; plan: string } | null; recentActivity: any[] }

const COLORS = ['#c9a84c', '#e2e8f0', '#7dd3fc', '#c084fc', '#34d399', '#f59e0b']
const tooltipStyle = { background: '#12121f', border: '1px solid #2b2b45', borderRadius: 12, color: '#fff' }

function ChartEmpty({ text }: { text: string }) { return <div className="h-64 flex items-center justify-center text-center text-gray-600 text-sm px-8">{text}</div> }

function ActivityIcon({ type }: { type: string }) {
  if (type === 'PROFIT' || type === 'REFERRAL_BONUS') return <TrendingUp size={16} className="text-green-400" />
  if (type === 'DEPOSIT') return <ArrowDownCircle size={16} className="text-blue-400" />
  if (type === 'WITHDRAWAL') return <ArrowUpCircle size={16} className="text-orange-400" />
  return <Activity size={16} className="text-gray-400" />
}

export default function DashboardPage() {
  const [data, setData] = useState<UserData | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [range, setRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([fetch('/api/user/me').then(r => r.json()), fetch(`/api/user/portfolio?range=${range}`).then(r => r.json())])
      .then(([user, summary]) => { if (mounted) { setData(user); setPortfolio(summary); setLoading(false) } })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [range])

  const copyReferral = () => {
    if (!data) return
    navigator.clipboard.writeText(`${window.location.origin}/auth/register?ref=${data.referralCode}`)
    setCopied(true); toast.success('Referral link copied!'); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" /></div>

  const summary = portfolio?.summary || {}
  const health = portfolio?.health || {}
  const activeInvestments = data?.investments?.filter(i => i.status === 'ACTIVE') || []
  const firstName = data?.fullName?.trim().split(/\s+/)[0] || 'Investor'
  const healthItems = [
    { label: 'Email verified', ok: health.emailVerified, href: '/dashboard/profile', icon: MailCheck },
    { label: 'KYC approved', ok: health.kycStatus === 'APPROVED', href: '/dashboard/kyc', icon: ShieldCheck },
    { label: 'Account active', ok: health.isActive, href: '/dashboard/profile', icon: Activity },
  ]
  const healthScore = Math.round((healthItems.filter(item => item.ok).length / healthItems.length) * 100)
  const investedCapital = Number(summary.activeCapital || 0)
  const nextMilestone = investedCapital > 0 ? Math.ceil(investedCapital / 1000) * 1000 : 1000
  const milestoneProgress = Math.min(100, Math.round((investedCapital / nextMilestone) * 100))
  const stats = [
    { label: 'Available Balance', value: formatCurrency(summary.balance ?? data?.balance ?? 0), icon: DollarSign, color: '#c9a84c', change: 'Available to invest or withdraw' },
    { label: 'Active Capital', value: formatCurrency(summary.activeCapital || 0), icon: Wallet, color: '#60a5fa', change: `${summary.activeInvestments || 0} active investment(s)` },
    { label: 'ROI Earned', value: formatCurrency(summary.totalProfit ?? data?.totalProfit ?? 0), icon: TrendingUp, color: '#34d399', change: `${formatCurrency(summary.roiPaidOnActive || 0)} paid on active plans` },
    { label: 'Total Withdrawn', value: formatCurrency(summary.totalWithdrawn ?? data?.totalWithdrawn ?? 0), icon: ArrowUpCircle, color: '#f87171', change: 'All-time withdrawals' },
  ]

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-[#c9a84c]/20 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.24),transparent_38%),linear-gradient(135deg,#17172a,#0e0e1d)] p-6 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#c9a84c]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e8cc7a]"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Portfolio live</div><h1 className="text-2xl font-black sm:text-3xl">Good to see you, {firstName}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">Your capital, performance, and next actions are organized here so you can make your next move with confidence.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/dashboard/deposit" className="btn-gold rounded-xl px-4 py-2.5 text-sm">Add funds</Link><Link href="/dashboard/plans" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-[#c9a84c]/40 hover:text-white">Explore plans</Link></div></div>
          {portfolio?.nextPayout && <div className="min-w-[220px] rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><CalendarClock size={15} />Next payout</div><div className="text-2xl font-black text-white">+{formatCurrency(portfolio.nextPayout.amount)}</div><div className="mt-1 text-xs text-gray-400">{portfolio.nextPayout.plan} · expected soon</div></div>}
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><h2 className="text-xl font-black mb-1">Portfolio overview</h2><p className="text-gray-500 text-sm">A clear view of your balance, active capital, and daily ROI activity.</p></div>
        {portfolio?.nextPayout && <div className="card-dark px-4 py-3 flex items-center gap-3"><CalendarClock size={18} className="text-[#c9a84c]" /><div><div className="text-[10px] uppercase tracking-wider text-gray-500">Next expected ROI</div><div className="text-sm font-bold text-green-400">+{formatCurrency(portfolio.nextPayout.amount)} · {portfolio.nextPayout.plan}</div></div></div>}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{stats.map(({ label, value, icon: Icon, color, change }) => <div key={label} className="card-dark p-5"><div className="flex items-start justify-between mb-4"><div><p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p><p className="text-2xl font-black" style={{ color }}>{value}</p></div><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}><Icon size={20} style={{ color }} /></div></div><p className="text-gray-600 text-xs">{change}</p></div>)}</div>

      <div className="grid sm:grid-cols-3 gap-4">{[
        { href: '/dashboard/deposit', label: 'Make Deposit', sub: 'Fund your account', icon: ArrowDownCircle, color: '#60a5fa' },
        { href: '/dashboard/plans', label: 'Invest Now', sub: 'Choose a plan with daily ROI', icon: TrendingUp, color: '#c9a84c' },
        { href: '/dashboard/withdraw', label: 'Withdraw', sub: 'Cash out earnings', icon: ArrowUpCircle, color: '#34d399' },
      ].map(({ href, label, sub, icon: Icon, color }) => <Link key={href} href={href} className="card-dark p-5 flex items-center gap-4 hover:border-[#c9a84c]/40 transition-all group hover:-translate-y-0.5"><div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}><Icon size={22} style={{ color }} /></div><div><div className="font-bold text-sm group-hover:text-[#c9a84c] transition-colors">{label}</div><div className="text-gray-500 text-xs">{sub}</div></div></Link>)}</div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="card-dark p-6 xl:col-span-2"><div className="flex items-center justify-between mb-5 gap-3 flex-wrap"><div><h2 className="font-bold">ROI performance</h2><p className="text-gray-500 text-xs mt-1">Cumulative ROI and daily credits from recorded transactions.</p></div><div className="flex gap-1">{['7', '30', '90', 'all'].map(option => <button key={option} onClick={() => setRange(option)} className={`px-3 py-1.5 rounded-lg text-xs ${range === option ? 'bg-[#c9a84c] text-[#0a0a14] font-bold' : 'text-gray-500 hover:text-white bg-[#0a0a14]'}`}>{option === 'all' ? 'All' : `${option}d`}</button>)}</div></div>{portfolio?.performance?.length ? <ResponsiveContainer width="100%" height={270}><AreaChart data={portfolio.performance}><defs><linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c9a84c" stopOpacity={0.35} /><stop offset="95%" stopColor="#c9a84c" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#1e1e35" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} /><YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatCurrency(value), name === 'cumulativeRoi' ? 'Cumulative ROI' : 'Daily ROI']} /><Area type="monotone" dataKey="cumulativeRoi" stroke="#c9a84c" fill="url(#roiFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <ChartEmpty text="ROI performance will appear here after your first recorded credit." />}</div>
        <div className="card-dark p-6"><h2 className="font-bold">Capital allocation</h2><p className="text-gray-500 text-xs mt-1 mb-3">Active invested capital by plan.</p>{portfolio?.allocation?.length ? <><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={portfolio.allocation} dataKey="invested" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>{portfolio.allocation.map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} /></PieChart></ResponsiveContainer><div className="space-y-2">{portfolio.allocation.map((item: any, index: number) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-gray-400"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{item.name}</span><span className="font-semibold">{formatCurrency(item.invested)}</span></div>)}</div></> : <ChartEmpty text="Your allocation chart will appear after you activate an investment." />}</div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="card-dark p-6 xl:col-span-2"><h2 className="font-bold mb-1">Daily ROI activity</h2><p className="text-gray-500 text-xs mb-4">Recorded credits and cash movement for the selected period.</p>{portfolio?.performance?.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={portfolio.performance}><CartesianGrid stroke="#1e1e35" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} /><YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={value => `$${value}`} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatCurrency(value), name === 'roi' ? 'ROI' : name === 'deposits' ? 'Deposits' : 'Withdrawals']} /><Bar dataKey="roi" fill="#34d399" radius={[4, 4, 0, 0]} /><Bar dataKey="deposits" fill="#60a5fa" radius={[4, 4, 0, 0]} /><Bar dataKey="withdrawals" fill="#f97316" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <ChartEmpty text="Daily activity will appear after your first account transaction." />}</div>
        <div className="card-dark p-6"><h2 className="font-bold mb-1">Account health</h2><p className="text-gray-500 text-xs mb-5">Keep these items complete for smoother access.</p><div className="space-y-3">{healthItems.map(({ label, ok, href, icon: Icon }) => <Link key={label} href={href} className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a14] border border-[#1e1e35] hover:border-[#c9a84c]/30"><Icon size={17} className={ok ? 'text-green-400' : 'text-yellow-400'} /><span className="text-sm flex-1">{label}</span><span className={`text-xs ${ok ? 'text-green-400' : 'text-yellow-400'}`}>{ok ? 'Complete' : 'Review'}</span></Link>)}</div>{health.kycStatus !== 'APPROVED' && <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-2 text-xs text-yellow-300"><AlertTriangle size={15} className="flex-shrink-0" />Complete KYC to improve withdrawal access.</div>}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-dark p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-bold">Your next milestone</h2><p className="mt-1 text-xs text-gray-500">Build invested capital one clear step at a time.</p></div><TrendingUp size={19} className="text-[#c9a84c]" /></div><div className="mb-3 flex items-end justify-between"><div><span className="text-3xl font-black text-white">{formatCurrency(investedCapital)}</span><span className="ml-2 text-xs text-gray-500">invested</span></div><span className="text-sm font-bold text-[#e8cc7a]">{milestoneProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#0a0a14]"><div className="h-full rounded-full bg-gradient-to-r from-[#a47c22] to-[#e8cc7a] transition-all" style={{ width: `${milestoneProgress}%` }} /></div><div className="mt-3 flex justify-between text-xs text-gray-500"><span>Keep your momentum going</span><span>{formatCurrency(nextMilestone)} target</span></div></div>
        <div className="card-dark p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-bold">Account readiness</h2><p className="mt-1 text-xs text-gray-500">Complete the essentials for smoother investing.</p></div><span className="text-2xl font-black text-emerald-400">{healthScore}%</span></div><div className="grid grid-cols-3 gap-3">{healthItems.map(({ label, ok, href, icon: Icon }) => <Link key={label} href={href} className={`rounded-xl border p-3 transition hover:border-[#c9a84c]/40 ${ok ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-yellow-400/20 bg-yellow-400/5'}`}><Icon size={17} className={ok ? 'text-emerald-400' : 'text-yellow-400'} /><span className="mt-2 block text-[11px] font-semibold leading-tight text-gray-300">{label.replace(' verified', '')}</span><span className={`mt-1 block text-[10px] ${ok ? 'text-emerald-400' : 'text-yellow-400'}`}>{ok ? 'Ready' : 'Review'}</span></Link>)}</div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6"><div className="card-dark p-6"><div className="flex items-center justify-between mb-5"><h2 className="font-bold">Active Investments</h2><Link href="/dashboard/plans" className="text-[#c9a84c] text-xs hover:underline">+ New Investment</Link></div>{activeInvestments.length ? <div className="space-y-3">{activeInvestments.slice(0, 4).map((inv: any) => <div key={inv.id} className="flex items-center justify-between p-4 bg-[#0a0a14] rounded-xl border border-[#1e1e35]"><div><div className="font-semibold text-sm">{inv.plan?.name}</div><div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><Clock size={11} /> Matures {formatDate(inv.endDate)}</div></div><div className="text-right"><div className="font-bold text-sm">{formatCurrency(inv.amount)}</div><div className="text-green-400 text-xs">+{formatCurrency(inv.roiPaid || 0)} ROI paid</div></div></div>)}</div> : <div className="text-center py-10 text-gray-600"><TrendingUp size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No active investments</p><Link href="/dashboard/plans" className="text-[#c9a84c] text-xs mt-2 inline-block hover:underline">Start investing →</Link></div>}</div>
        <div className="card-dark p-6"><div className="flex items-center justify-between mb-5"><h2 className="font-bold">Recent activity</h2><Link href="/dashboard/transactions" className="text-[#c9a84c] text-xs hover:underline">View all</Link></div>{portfolio?.recentActivity?.length ? <div className="space-y-2">{portfolio.recentActivity.slice(0, 6).map((tx: any) => <div key={tx.id} className="flex items-center gap-3 p-3 bg-[#0a0a14] rounded-xl border border-[#1e1e35]"><div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><ActivityIcon type={tx.type} /></div><div className="flex-1 min-w-0"><div className="font-semibold text-sm capitalize truncate">{tx.type.replace(/_/g, ' ')}</div><div className="text-gray-500 text-xs">{formatDate(tx.createdAt)}</div></div><div className="text-right"><div className="font-bold text-sm">{formatCurrency(tx.amount)}</div><span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(tx.status)}`}>{tx.status}</span></div></div>)}</div> : <div className="text-center py-10 text-gray-600"><p className="text-sm">No activity yet</p></div>}</div></div>

      <div className="card-dark p-6 border-[#c9a84c]/20"><div className="flex items-start justify-between flex-wrap gap-4"><div><h2 className="font-bold mb-1">Your Referral Program</h2><p className="text-gray-500 text-sm">Earn up to 15% bonus for every investor you refer</p></div><div className="flex items-center gap-3 bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3"><code className="text-[#c9a84c] text-sm font-mono">{data?.referralCode}</code><button onClick={copyReferral} className="text-gray-400 hover:text-[#c9a84c] transition-colors">{copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}</button></div></div></div>
    </div>
  )
}
