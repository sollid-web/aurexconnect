'use client'
import { useEffect, useState, useCallback } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { durationLabel, formatUsd } from '@/lib/plans'
import {
  Users, DollarSign, ArrowUpCircle, ArrowDownCircle,
  Search, UserCheck, UserX, PlusCircle, Loader2,
  FileCheck, CheckCircle, XCircle, Eye, Clock,
  TrendingUp, Shield, BarChart3, AlertTriangle, X,
  MinusCircle, Wallet, ListOrdered, ChevronRight,
  Receipt, ToggleLeft, ToggleRight, Mail, UserCog, KeyRound, Save, Settings, LogOut
} from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'overview' | 'deposits' | 'withdrawals' | 'kyc' | 'users' | 'roi' | 'email' | 'settings'

// ─────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await window.fetch(input, init)
    if (response.status === 401) {
      toast.error('Your admin session expired or access was revoked. Please sign in again.')
      const callbackUrl = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    } else if (!response.ok) {
      let message = `Request failed (${response.status})`
      try { message = (await response.clone().json()).error || message } catch {}
      toast.error(message)
    }
    return response
  } catch {
    toast.error('Unable to reach the server. Check your connection and try again.')
    return new Response(JSON.stringify({ error: 'Network request failed' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }
}

function Spinner() {
  return <div className="w-8 h-8 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
}

function ReviewModal({ title, subtitle, onClose, onApprove, onReject, loading, children }: {
  title: string; subtitle?: string
  onClose: () => void; onApprove: (n: string) => void; onReject: (n: string) => void
  loading: boolean; children?: React.ReactNode
}) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121f] border border-[#1e1e35] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-start justify-between p-6 border-b border-[#1e1e35]">
          <div><h3 className="font-bold text-lg">{title}</h3>{subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-white ml-4"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {children}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Admin Note <span className="text-gray-500">(shown to user on rejection)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Optional note..."
              className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={() => onReject(note)} disabled={loading}
            className="flex-1 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-400/10 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={16} />} Reject
          </button>
          <button onClick={() => onApprove(note)} disabled={loading}
            className="flex-1 btn-gold py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={16} />} Approve
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// User Detail Drawer — credit / debit / assign investment
// ─────────────────────────────────────────────────────────────────────
function UserDrawer({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [user, setUser] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAction, setActiveAction] = useState<'credit' | 'debit' | 'profit' | 'invest' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Credit / Debit form
  const [adjAmount, setAdjAmount] = useState('')
  const [adjNote, setAdjNote] = useState('')
  const [profitDirection, setProfitDirection] = useState<'credit' | 'debit'>('credit')

  // Invest form
  const [investPlanId, setInvestPlanId] = useState('')
  const [investAmount, setInvestAmount] = useState('')
  const [bypassBalance, setBypassBalance] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileCountry, setProfileCountry] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      adminFetch(`/api/admin/users/detail?userId=${userId}`).then(r => r.json()),
      adminFetch('/api/plans').then(r => r.json()),
    ]).then(([u, p]) => {
      setUser(u)
      setProfileName(u.fullName || '')
      setProfileEmail(u.email || '')
      setProfilePhone(u.phone || '')
      setProfileCountry(u.country || '')
      setPlans(Array.isArray(p) ? p : [])
      if (p.length > 0) setInvestPlanId(p[0].id)
      setLoading(false)
    })
  }, [userId])

  const doAction = async () => {
    if (!activeAction) return
    setActionLoading(true)

    let body: any = { userId, action: '' }

    if (activeAction === 'credit') {
      if (!adjAmount || parseFloat(adjAmount) <= 0) { toast.error('Enter a valid amount'); setActionLoading(false); return }
      body = { userId, action: 'creditBalance', amount: parseFloat(adjAmount), note: adjNote }
    } else if (activeAction === 'debit') {
      if (!adjAmount || parseFloat(adjAmount) <= 0) { toast.error('Enter a valid amount'); setActionLoading(false); return }
      body = { userId, action: 'debitBalance', amount: parseFloat(adjAmount), note: adjNote }
    } else if (activeAction === 'profit') {
      if (!adjAmount || parseFloat(adjAmount) <= 0) { toast.error('Enter a valid amount'); setActionLoading(false); return }
      body = { userId, action: 'adjustProfit', amount: parseFloat(adjAmount), direction: profitDirection, note: adjNote }
    } else if (activeAction === 'invest') {
      if (!investPlanId || !investAmount || parseFloat(investAmount) <= 0) { toast.error('Select a plan and enter amount'); setActionLoading(false); return }
      body = { userId, action: 'assignInvestment', planId: investPlanId, amount: parseFloat(investAmount), bypassBalance }
    }

    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
      } else {
        toast.success(data.message)
        setActiveAction(null)
        setAdjAmount(''); setAdjNote(''); setInvestAmount('')
        // Refresh user data
        const updated = await adminFetch(`/api/admin/users/detail?userId=${userId}`).then(r => r.json())
        setUser(updated)
        onRefresh()
      }
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleActive = async () => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'toggleActive' }),
    })
    if (res.ok) {
      const updated = await adminFetch(`/api/admin/users/detail?userId=${userId}`).then(r => r.json())
      setUser(updated)
      onRefresh()
      toast.success('User status updated')
    }
  }

  const updateProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) return toast.error('Name and email are required')
    setProfileSaving(true)
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'updateProfile', fullName: profileName, email: profileEmail, phone: profilePhone || null, country: profileCountry || null }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Profile update failed')
      setUser((current: any) => ({ ...current, ...data.user }))
      toast.success('User profile updated')
      onRefresh()
    } catch { toast.error('Profile update failed') } finally { setProfileSaving(false) }
  }

  const changeRole = async () => {
    const role = user?.role === 'ADMIN' ? 'USER' : 'ADMIN'
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'setRole', role }),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error || 'Role update failed')
    setUser((current: any) => ({ ...current, ...data.user }))
    toast.success(data.message)
    onRefresh()
  }

  const sendPasswordReset = async () => {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'sendPasswordReset' }),
    })
    const data = await res.json()
    if (res.ok) toast.success(data.message)
    else toast.error(data.error || 'Could not send reset link')
  }

  const selectedPlan = plans.find(p => p.id === investPlanId)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-[#12121f] border-l border-[#1e1e35] flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e35] flex-shrink-0">
          <h2 className="font-bold text-lg">User Management</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Spinner /></div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* User info header */}
            <div className="px-6 py-5 border-b border-[#1e1e35] bg-[#0a0a14]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center text-[#0a0a14] text-xl font-black flex-shrink-0">
                  {user?.fullName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg">{user?.fullName}</div>
                  <div className="text-gray-500 text-sm">{user?.email}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${user?.isActive ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                      {user?.isActive ? 'Active' : 'Suspended'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user?.kycStatus === 'APPROVED' ? 'bg-green-400/10 text-green-400' :
                      user?.kycStatus === 'PENDING' ? 'bg-yellow-400/10 text-yellow-400' :
                      'bg-gray-400/10 text-gray-400'
                    }`}>KYC: {user?.kycStatus}</span>
                    {user?.role === 'ADMIN' && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">ADMIN</span>}
                  </div>
                </div>
                {user?.role !== 'ADMIN' && (
                  <button onClick={toggleActive}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${
                      user?.isActive
                        ? 'border-red-500/30 text-red-400 hover:bg-red-400/10'
                        : 'border-green-500/30 text-green-400 hover:bg-green-400/10'
                    }`}>
                    {user?.isActive ? <><UserX size={13} /> Suspend</> : <><UserCheck size={13} /> Activate</>}
                  </button>
                )}
              </div>

              {/* Balance grid */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Balance', value: formatCurrency(user?.balance || 0), color: '#c9a84c' },
                  { label: 'Deposited', value: formatCurrency(user?.totalDeposited || 0), color: '#60a5fa' },
                  { label: 'Profit', value: formatCurrency(user?.totalProfit || 0), color: '#34d399' },
                  { label: 'Withdrawn', value: formatCurrency(user?.totalWithdrawn || 0), color: '#f87171' },
                ].map(s => (
                  <div key={s.label} className="bg-[#12121f] border border-[#1e1e35] rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                    <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account controls */}
            <div className="px-6 py-5 border-b border-[#1e1e35] bg-[#12121f]">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2"><UserCog size={13} /> Account Controls</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Full name"
                  className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="Email address"
                  className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
                <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="Phone (optional)"
                  className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
                <input value={profileCountry} onChange={e => setProfileCountry(e.target.value)} placeholder="Country (optional)"
                  className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={updateProfile} disabled={profileSaving} className="flex items-center gap-1.5 rounded-xl bg-[#c9a84c] px-3 py-2 text-xs font-bold text-[#0a0a14] disabled:opacity-50"><Save size={13} /> {profileSaving ? 'Saving...' : 'Save profile'}</button>
                <button onClick={changeRole} className="flex items-center gap-1.5 rounded-xl border border-purple-400/30 bg-purple-400/10 px-3 py-2 text-xs font-semibold text-purple-300"><Shield size={13} /> {user?.role === 'ADMIN' ? 'Remove admin role' : 'Grant admin role'}</button>
                <button onClick={sendPasswordReset} className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-300"><KeyRound size={13} /> Send reset link</button>
              </div>
              <p className="text-[11px] text-gray-600 mt-3">Role changes are audited. Passwords are never shown to administrators; users receive a single-use reset link.</p>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-5 border-b border-[#1e1e35]">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Admin Actions</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'credit', label: 'Credit Balance', icon: PlusCircle, color: '#34d399', bg: 'bg-green-400/10 border-green-400/20 hover:bg-green-400/15', active: 'bg-green-400/20 border-green-400/40 text-green-400' },
                  { id: 'debit', label: 'Debit Balance', icon: MinusCircle, color: '#f87171', bg: 'bg-red-400/10 border-red-400/20 hover:bg-red-400/15', active: 'bg-red-400/20 border-red-400/40 text-red-400' },
                  { id: 'profit', label: 'Adjust Profit', icon: TrendingUp, color: '#34d399', bg: 'bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/15', active: 'bg-emerald-400/20 border-emerald-400/40 text-emerald-400' },
                  { id: 'invest', label: 'Assign Plan', icon: TrendingUp, color: '#c9a84c', bg: 'bg-[#c9a84c]/10 border-[#c9a84c]/20 hover:bg-[#c9a84c]/15', active: 'bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]' },
                ].map(btn => {
                  const Icon = btn.icon
                  const isActive = activeAction === btn.id
                  return (
                    <button key={btn.id}
                      onClick={() => setActiveAction(isActive ? null : btn.id as any)}
                      className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border text-xs font-semibold transition-all ${isActive ? btn.active : `${btn.bg} text-gray-300`}`}>
                      <Icon size={18} style={{ color: isActive ? undefined : btn.color }} />
                      {btn.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action form panel */}
            {activeAction && (
              <div className="px-6 py-5 border-b border-[#1e1e35] bg-[#0a0a14]">
                {(activeAction === 'credit' || activeAction === 'debit') && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {activeAction === 'credit' ? <PlusCircle size={15} className="text-green-400" /> : <MinusCircle size={15} className="text-red-400" />}
                      {activeAction === 'credit' ? 'Credit Balance' : 'Debit Balance'}
                      <span className="text-gray-500 font-normal">→ {user?.fullName}</span>
                    </h3>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Amount (USD) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input type="number" min="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)}
                          placeholder="0.00" autoFocus
                          className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Reason / Note (shown to user)</label>
                      <input type="text" value={adjNote} onChange={e => setAdjNote(e.target.value)}
                        placeholder="e.g. Bonus reward, correction, promotion..."
                        className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
                    </div>
                    {activeAction === 'debit' && adjAmount && (
                      <div className={`text-xs px-3 py-2 rounded-lg ${parseFloat(adjAmount) > user?.balance ? 'bg-red-400/10 text-red-400' : 'bg-[#12121f] text-gray-400'}`}>
                        Current balance: {formatCurrency(user?.balance || 0)}
                        {parseFloat(adjAmount) > user?.balance && ' — insufficient funds to debit this amount'}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setActiveAction(null)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e35] text-gray-400 text-sm">Cancel</button>
                      <button onClick={doAction} disabled={actionLoading || !adjAmount}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
                          activeAction === 'credit' ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400'
                        }`}>
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                        {activeAction === 'credit' ? `Credit $${adjAmount || '0'}` : `Debit $${adjAmount || '0'}`}
                      </button>
                    </div>
                  </div>
                )}

                {activeAction === 'profit' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp size={15} className="text-emerald-400" />Adjust Recorded Profit <span className="text-gray-500 font-normal">→ {user?.fullName}</span></h3>
                    <p className="text-xs leading-relaxed text-gray-500">Profit adjustments also update the available balance and create an audited transaction. Use this only for corrections or approved manual rewards.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setProfitDirection('credit')} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${profitDirection === 'credit' ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' : 'border-[#1e1e35] text-gray-500'}`}>Credit profit</button>
                      <button onClick={() => setProfitDirection('debit')} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${profitDirection === 'debit' ? 'border-red-400/40 bg-red-400/15 text-red-300' : 'border-[#1e1e35] text-gray-500'}`}>Reverse profit</button>
                    </div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Profit amount (USD) *</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span><input type="number" min="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} placeholder="0.00" autoFocus className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" /></div></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Reason / Note</label><input type="text" value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="e.g. approved correction or bonus" className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" /></div>
                    <div className="flex gap-3"><button onClick={() => setActiveAction(null)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e35] text-gray-400 text-sm">Cancel</button><button onClick={doAction} disabled={actionLoading || !adjAmount} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${profitDirection === 'credit' ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-400'}`}>{actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}{profitDirection === 'credit' ? `Credit $${adjAmount || '0'}` : `Reverse $${adjAmount || '0'}`}</button></div>
                  </div>
                )}

                {activeAction === 'invest' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <TrendingUp size={15} className="text-[#c9a84c]" />
                      Assign Investment Plan
                      <span className="text-gray-500 font-normal">→ {user?.fullName}</span>
                    </h3>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Select Plan *</label>
                      <select value={investPlanId} onChange={e => { setInvestPlanId(e.target.value); setInvestAmount('') }}
                        className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#c9a84c]">
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.roiPercent}% ROI over {durationLabel(p.durationDays)} ({formatUsd(p.minAmount)}–{formatUsd(p.maxAmount)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedPlan && (
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        {[
                          { label: 'ROI', value: `${selectedPlan.roiPercent}%`, color: '#c9a84c' },
                          { label: 'Duration', value: durationLabel(selectedPlan.durationDays), color: '#60a5fa' },
                          { label: 'Range', value: `${formatUsd(selectedPlan.minAmount)}–${formatUsd(selectedPlan.maxAmount)}`, color: '#34d399' },
                        ].map(s => (
                          <div key={s.label} className="bg-[#12121f] border border-[#1e1e35] rounded-lg py-2">
                            <div className="text-gray-500 mb-0.5">{s.label}</div>
                            <div className="font-bold" style={{ color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Investment Amount (USD) *
                        {selectedPlan && <span className="text-gray-600 ml-1">Range: {formatUsd(selectedPlan.minAmount)} – {formatUsd(selectedPlan.maxAmount)}</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input type="number" value={investAmount} onChange={e => setInvestAmount(e.target.value)}
                          min={selectedPlan?.minAmount} max={selectedPlan?.maxAmount ?? undefined}
                          placeholder={selectedPlan ? String(selectedPlan.minAmount) : '0'}
                          className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
                      </div>
                    </div>

                    {investAmount && selectedPlan && parseFloat(investAmount) > 0 && (
                      <div className="bg-[#12121f] border border-[#1e1e35] rounded-xl p-3 text-xs space-y-2">
                        <div className="flex justify-between text-gray-400">
                          <span>Investment</span><span className="text-white font-bold">{formatCurrency(parseFloat(investAmount))}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Expected Profit</span><span className="text-green-400 font-bold">+{formatCurrency(parseFloat(investAmount) * selectedPlan.roiPercent / 100)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Total Return</span><span className="text-[#c9a84c] font-bold">{formatCurrency(parseFloat(investAmount) * (1 + selectedPlan.roiPercent / 100))}</span>
                        </div>
                      </div>
                    )}

                    {/* Bypass balance toggle */}
                    <div className="flex items-center justify-between bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3">
                      <div>
                        <div className="text-sm font-medium">Bypass Balance Check</div>
                        <div className="text-xs text-gray-500 mt-0.5">Assign investment even if user lacks balance (admin funded)</div>
                      </div>
                      <button onClick={() => setBypassBalance(!bypassBalance)}
                        className={`flex-shrink-0 transition-colors ${bypassBalance ? 'text-[#c9a84c]' : 'text-gray-600'}`}>
                        {bypassBalance ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>

                    {!bypassBalance && investAmount && user?.balance < parseFloat(investAmount) && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 text-yellow-400 text-xs">
                        <AlertTriangle size={13} /> User balance ({formatCurrency(user?.balance)}) is less than investment amount. Enable bypass or credit balance first.
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => setActiveAction(null)} className="flex-1 py-2.5 rounded-xl border border-[#1e1e35] text-gray-400 text-sm">Cancel</button>
                      <button onClick={doAction} disabled={actionLoading || !investAmount || !investPlanId}
                        className="flex-1 btn-gold py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                        Assign Investment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Investments list */}
            <div className="px-6 py-5 border-b border-[#1e1e35]">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                <ListOrdered size={13} /> Investments ({user?.investments?.length || 0})
              </div>
              {user?.investments?.length === 0 ? (
                <p className="text-gray-600 text-xs">No investments yet</p>
              ) : (
                <div className="space-y-2">
                  {user?.investments?.slice(0, 8).map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3">
                      <div>
                        <div className="text-sm font-medium">{inv.plan?.name}</div>
                        <div className="text-gray-500 text-xs">{formatDate(inv.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(inv.amount)}</div>
                        <div className="text-green-400 text-xs">+{formatCurrency(inv.expectedProfit)}</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${
                          inv.status === 'ACTIVE' ? 'bg-blue-400/10 text-blue-400' :
                          inv.status === 'COMPLETED' ? 'bg-green-400/10 text-green-400' :
                          'bg-gray-400/10 text-gray-400'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions list */}
            <div className="px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                <Receipt size={13} /> Recent Transactions
              </div>
              {user?.transactions?.length === 0 ? (
                <p className="text-gray-600 text-xs">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {user?.transactions?.slice(0, 8).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3">
                      <div>
                        <div className="text-sm capitalize font-medium">{tx.type.replace(/_/g, ' ').toLowerCase()}</div>
                        <div className="text-gray-500 text-xs">{formatDate(tx.createdAt)}</div>
                        {tx.note && <div className="text-gray-600 text-xs mt-0.5 max-w-[160px] truncate">{tx.note}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatCurrency(tx.amount)}</div>
                        <StatusBadge status={tx.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-5 border-t border-[#1e1e35]">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2"><Shield size={13} /> Admin Audit Trail</div>
              {user?.adminAuditLogs?.length ? <div className="space-y-2">{user.adminAuditLogs.slice(0, 8).map((log: any) => <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#0a0a14] border border-[#1e1e35] px-3 py-2"><div><div className="text-xs font-semibold text-gray-300">{log.action.replace(/_/g, ' ')}</div>{log.details && <div className="text-[11px] text-gray-600 truncate max-w-[210px]">{log.details}</div>}</div><span className="text-[10px] text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</span></div>)}</div> : <p className="text-xs text-gray-600">No administrative actions recorded for this account.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Deposits Tab
// ─────────────────────────────────────────────────────────────────────
function DepositsTab() {
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [reviewing, setReviewing] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch(`/api/admin/transactions?type=DEPOSIT&status=${filter}`)
    const data = await res.json()
    setDeposits(data.transactions || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetch_() }, [fetch_])

  const handleReview = async (action: 'approve' | 'reject', note: string) => {
    setActionLoading(true)
    const res = await adminFetch('/api/admin/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: reviewing.id, action, adminNote: note }),
    })
    const data = await res.json()
    if (res.ok) { toast.success(data.message); setReviewing(null); fetch_() } else toast.error(data.error)
    setActionLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === s ? 'bg-[#c9a84c] text-[#0a0a14]' : 'bg-[#12121f] border border-[#1e1e35] text-gray-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-40"><Spinner /></div> :
          deposits.length === 0 ? <div className="text-center py-16 text-gray-600"><ArrowDownCircle size={36} className="mx-auto mb-3 opacity-30" /><p>No deposits found</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a14]"><tr>{['User', 'Amount', 'Currency', 'TX Hash', 'Status', 'Date', 'Action'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr></thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {deposits.map((d: any) => (
                  <tr key={d.id} className="hover:bg-white/2">
                    <td className="px-5 py-4"><div className="font-medium text-sm">{d.user?.fullName}</div><div className="text-gray-500 text-xs">{d.user?.email}</div></td>
                    <td className="px-5 py-4 font-bold text-[#c9a84c] text-sm">{formatCurrency(d.amount)}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{d.currency}</td>
                    <td className="px-5 py-4"><code className="text-xs text-gray-400 bg-[#0a0a14] px-2 py-1 rounded">{d.txHash ? `${d.txHash.slice(0, 14)}…` : '—'}</code></td>
                    <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(d.createdAt)}</td>
                    <td className="px-5 py-4">
                      {d.status === 'PENDING' ? (
                        <button onClick={() => setReviewing(d)} className="flex items-center gap-1.5 text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/30 px-3 py-1.5 rounded-lg hover:bg-[#c9a84c]/20 transition-all">
                          <Eye size={12} /> Review
                        </button>
                      ) : <span className="text-gray-600 text-xs">{d.adminNote || '—'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {reviewing && (
        <ReviewModal title={`Review Deposit — ${formatCurrency(reviewing.amount)}`} subtitle={`From ${reviewing.user?.fullName}`}
          onClose={() => setReviewing(null)} onApprove={n => handleReview('approve', n)} onReject={n => handleReview('reject', n)} loading={actionLoading}>
          <div className="bg-[#0a0a14] rounded-xl p-4 space-y-2.5 text-sm">
            {[['User', reviewing.user?.fullName], ['Amount', formatCurrency(reviewing.amount)], ['Currency', reviewing.currency], ['TX Hash', reviewing.txHash || 'N/A'], ['Submitted', formatDate(reviewing.createdAt)]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          {reviewing.proofImageUrl && <a href={reviewing.proofImageUrl} target="_blank" rel="noopener noreferrer" className="text-[#c9a84c] text-xs underline">View proof image ↗</a>}
        </ReviewModal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Withdrawals Tab
// ─────────────────────────────────────────────────────────────────────
function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [reviewing, setReviewing] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch(`/api/admin/transactions?type=WITHDRAWAL&status=${filter}`)
    const data = await res.json()
    setWithdrawals(data.transactions || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetch_() }, [fetch_])

  const handleReview = async (action: 'approve' | 'reject', note: string) => {
    setActionLoading(true)
    const res = await adminFetch('/api/admin/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: reviewing.id, action, adminNote: note }),
    })
    const data = await res.json()
    if (res.ok) { toast.success(data.message); setReviewing(null); fetch_() } else toast.error(data.error)
    setActionLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-yellow-400 text-xs"><strong>Important:</strong> Approving means you have already sent the crypto. Rejecting refunds the user's balance automatically.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === s ? 'bg-[#c9a84c] text-[#0a0a14]' : 'bg-[#12121f] border border-[#1e1e35] text-gray-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-40"><Spinner /></div> :
          withdrawals.length === 0 ? <div className="text-center py-16 text-gray-600"><ArrowUpCircle size={36} className="mx-auto mb-3 opacity-30" /><p>No withdrawals found</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a14]"><tr>{['User', 'Amount', 'Currency', 'Wallet', 'Status', 'Date', 'Action'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr></thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {withdrawals.map((w: any) => (
                  <tr key={w.id} className="hover:bg-white/2">
                    <td className="px-5 py-4"><div className="font-medium text-sm">{w.user?.fullName}</div><div className="text-gray-500 text-xs">{w.user?.email}</div></td>
                    <td className="px-5 py-4 font-bold text-orange-400 text-sm">{formatCurrency(w.amount)}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{w.currency}</td>
                    <td className="px-5 py-4"><code className="text-xs text-gray-400 max-w-[120px] block truncate">{w.walletAddress || '—'}</code></td>
                    <td className="px-5 py-4"><StatusBadge status={w.status} /></td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(w.createdAt)}</td>
                    <td className="px-5 py-4">
                      {w.status === 'PENDING' ? (
                        <button onClick={() => setReviewing(w)} className="flex items-center gap-1.5 text-xs bg-orange-400/10 text-orange-400 border border-orange-400/30 px-3 py-1.5 rounded-lg hover:bg-orange-400/20 transition-all">
                          <Eye size={12} /> Review
                        </button>
                      ) : <span className="text-gray-600 text-xs">{w.adminNote || '—'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {reviewing && (
        <ReviewModal title={`Review Withdrawal — ${formatCurrency(reviewing.amount)}`} subtitle={`${reviewing.user?.fullName} · ${reviewing.currency}`}
          onClose={() => setReviewing(null)} onApprove={n => handleReview('approve', n)} onReject={n => handleReview('reject', n)} loading={actionLoading}>
          <div className="bg-[#0a0a14] rounded-xl p-4 space-y-2.5 text-sm">
            {[['User', reviewing.user?.fullName], ['Amount', formatCurrency(reviewing.amount)], ['Currency', reviewing.currency], ['Wallet', reviewing.walletAddress], ['Requested', formatDate(reviewing.createdAt)]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between items-start gap-2"><span className="text-gray-500 flex-shrink-0">{l}</span><span className="font-medium text-right break-all">{v}</span></div>
            ))}
          </div>
        </ReviewModal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// KYC Tab
// ─────────────────────────────────────────────────────────────────────
function KycTab() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [reviewing, setReviewing] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [signedFiles, setSignedFiles] = useState<Record<string, string>>({})

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch(`/api/admin/kyc?status=${filter}`)
    const data = await res.json()
    setSubmissions(data.submissions || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetch_() }, [fetch_])

  useEffect(() => {
    if (!reviewing) { setSignedFiles({}); return }
    const paths = [reviewing.frontImageUrl, reviewing.backImageUrl, reviewing.selfieUrl].filter(Boolean)
    Promise.all(paths.map(async (path: string) => {
      const response = await adminFetch(`/api/admin/kyc/file?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      return [path, data.url] as const
    })).then(entries => setSignedFiles(Object.fromEntries(entries.filter(([, url]) => url))))
  }, [reviewing])

  const handleReview = async (action: 'approve' | 'reject', note: string) => {
    setActionLoading(true)
    const res = await adminFetch('/api/admin/kyc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: reviewing.id, action, adminNote: note }),
    })
    const data = await res.json()
    if (res.ok) { toast.success(data.message); setReviewing(null); fetch_() } else toast.error(data.error)
    setActionLoading(false)
  }

  const KYC_COLOR: Record<string, string> = { APPROVED: 'text-green-400 bg-green-400/10', PENDING: 'text-yellow-400 bg-yellow-400/10', REJECTED: 'text-red-400 bg-red-400/10', NONE: 'text-gray-400 bg-gray-400/10' }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === s ? 'bg-[#c9a84c] text-[#0a0a14]' : 'bg-[#12121f] border border-[#1e1e35] text-gray-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-40"><Spinner /></div> :
          submissions.length === 0 ? <div className="text-center py-16 text-gray-600"><FileCheck size={36} className="mx-auto mb-3 opacity-30" /><p>No KYC submissions</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a14]"><tr>{['User', 'Doc Type', 'Doc Number', 'Status', 'Submitted', 'Action'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr></thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {submissions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/2">
                    <td className="px-5 py-4"><div className="font-medium text-sm">{s.user?.fullName}</div><div className="text-gray-500 text-xs">{s.user?.email}</div></td>
                    <td className="px-5 py-4 text-sm text-gray-300 capitalize">{s.documentType.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-4"><code className="text-xs text-gray-400">{s.documentNumber}</code></td>
                    <td className="px-5 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${KYC_COLOR[s.status]}`}>{s.status}</span></td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="px-5 py-4">
                      {s.status === 'PENDING' ? (
                        <button onClick={() => setReviewing(s)} className="flex items-center gap-1.5 text-xs bg-blue-400/10 text-blue-400 border border-blue-400/30 px-3 py-1.5 rounded-lg hover:bg-blue-400/20">
                          <Eye size={12} /> Review
                        </button>
                      ) : <span className="text-gray-600 text-xs">{s.adminNote || '—'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {reviewing && (
        <ReviewModal title="Review KYC Submission" subtitle={`${reviewing.user?.fullName} · ${reviewing.documentType.replace(/_/g, ' ')}`}
          onClose={() => setReviewing(null)} onApprove={n => handleReview('approve', n)} onReject={n => handleReview('reject', n)} loading={actionLoading}>
          <div className="bg-[#0a0a14] rounded-xl p-4 space-y-2 text-sm">
            {[['Name', reviewing.user?.fullName], ['Email', reviewing.user?.email], ['Document', reviewing.documentType.replace(/_/g, ' ')], ['Number', reviewing.documentNumber]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between"><span className="text-gray-500">{l}</span><span>{v}</span></div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Front', path: reviewing.frontImageUrl }, { label: 'Back', path: reviewing.backImageUrl }, { label: 'Selfie', path: reviewing.selfieUrl }].filter(i => i.path && signedFiles[i.path]).map(({ label, path }) => (
              <a key={label} href={signedFiles[path]} target="_blank" rel="noopener noreferrer" className="block bg-[#0a0a14] border border-[#1e1e35] rounded-xl p-3 text-center hover:border-[#c9a84c]/40 transition-all">
                <div className="text-xs text-gray-500 mb-1">{label}</div><div className="text-[#c9a84c] text-xs">View ↗</div>
              </a>
            ))}
          </div>
        </ReviewModal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Users Tab — with drawer
// ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: '', email: '', phone: '', country: '', role: 'USER' as 'USER' | 'ADMIN' })

  const fetch_ = useCallback(async (q = '', requestedPage = 1) => {
    setLoading(true)
    const res = await adminFetch(`/api/admin/users?search=${encodeURIComponent(q)}&page=${requestedPage}&limit=${pageSize}`)
    const data = await res.json()
    setUsers(data.users || [])
    setTotal(data.total || 0)
    setPage(data.page || requestedPage)
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const createUser = async () => {
    if (!newUser.fullName.trim() || !newUser.email.trim()) return toast.error('Name and email are required')
    setCreateBusy(true)
    try {
      const res = await adminFetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Could not create user')
      toast.success(data.message)
      setNewUser({ fullName: '', email: '', phone: '', country: '', role: 'USER' })
      setCreateOpen(false)
      fetch_(search, 1)
    } catch { toast.error('Could not create user') } finally { setCreateBusy(false) }
  }

  const KYC_COLOR: Record<string, string> = { APPROVED: 'text-green-400', PENDING: 'text-yellow-400', REJECTED: 'text-red-400', NONE: 'text-gray-500' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h3 className="font-bold text-xl">User Management</h3><p className="text-gray-500 text-sm mt-1">Manage profiles, roles, access, balances, investments, and account recovery.</p></div>
        <button onClick={() => setCreateOpen(value => !value)} className="btn-gold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2"><PlusCircle size={14} /> Create user</button>
      </div>
      {createOpen && <div className="card-dark p-5 border-[#c9a84c]/20">
        <div className="flex items-center justify-between mb-4"><div><h4 className="font-bold">Create managed account</h4><p className="text-xs text-gray-500 mt-1">The user receives a single-use link to set their password.</p></div><button onClick={() => setCreateOpen(false)} className="text-gray-500 hover:text-white"><X size={18} /></button></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input value={newUser.fullName} onChange={e => setNewUser(v => ({ ...v, fullName: e.target.value }))} placeholder="Full name" className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
          <input type="email" value={newUser.email} onChange={e => setNewUser(v => ({ ...v, email: e.target.value }))} placeholder="Email address" className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
          <input value={newUser.phone} onChange={e => setNewUser(v => ({ ...v, phone: e.target.value }))} placeholder="Phone (optional)" className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
          <input value={newUser.country} onChange={e => setNewUser(v => ({ ...v, country: e.target.value }))} placeholder="Country (optional)" className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
          <select value={newUser.role} onChange={e => setNewUser(v => ({ ...v, role: e.target.value as 'USER' | 'ADMIN' }))} className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c9a84c]"><option value="USER">Standard user</option><option value="ADMIN">Administrator</option></select>
        </div>
        <button onClick={createUser} disabled={createBusy} className="mt-4 btn-gold px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">{createBusy ? 'Creating...' : 'Create account and send setup link'}</button>
      </div>}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetch_(search)}
            placeholder="Search by name or email..."
            className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" />
        </div>
        <button onClick={() => fetch_(search, 1)} className="btn-gold text-xs px-5 py-2.5 rounded-xl">Search</button>
      </div>
      <div className="card-dark overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#1e1e35] px-5 py-4 text-xs text-gray-500"><span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} users</span><span className="hidden sm:inline">Select a user to view activity, edit access, or manage funds.</span></div>
        {loading ? <div className="flex items-center justify-center h-40"><Spinner /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a14]"><tr>{['User', 'Balance', 'Deposited', 'KYC', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr></thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/2">
                    <td className="px-5 py-4"><div className="font-medium text-sm">{u.fullName}</div><div className="text-gray-500 text-xs">{u.email}</div>{u.role === 'ADMIN' && <span className="text-purple-400 text-xs font-bold">ADMIN</span>}</td>
                    <td className="px-5 py-4 font-bold text-[#c9a84c] text-sm">{formatCurrency(u.balance)}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{formatCurrency(u.totalDeposited)}</td>
                    <td className="px-5 py-4"><span className={`text-xs font-semibold ${KYC_COLOR[u.kycStatus || 'NONE']}`}>{u.kycStatus || 'NONE'}</span></td>
                    <td className="px-5 py-4"><span className={`text-xs px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => setDrawerUserId(u.id)}
                        className="flex items-center gap-1.5 text-xs bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/30 px-3 py-1.5 rounded-lg hover:bg-[#c9a84c]/20 transition-all">
                        <Eye size={12} /> View & edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="px-6 py-14 text-center"><Users size={32} className="mx-auto mb-3 text-gray-600" /><p className="text-sm font-semibold text-gray-300">No users found</p><p className="mt-1 text-xs text-gray-600">Try another name or email search, or create a new account.</p></div>}
          </div>
        )}
        {!loading && total > 0 && <div className="flex items-center justify-between border-t border-[#1e1e35] px-5 py-4"><button disabled={page <= 1} onClick={() => fetch_(search, page - 1)} className="rounded-lg border border-[#1e1e35] px-3 py-2 text-xs text-gray-400 transition hover:border-[#c9a84c]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Previous</button><span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / pageSize)}</span><button disabled={page >= Math.ceil(total / pageSize)} onClick={() => fetch_(search, page + 1)} className="rounded-lg border border-[#1e1e35] px-3 py-2 text-xs text-gray-400 transition hover:border-[#c9a84c]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Next</button></div>}
      </div>
      {drawerUserId && (
        <UserDrawer userId={drawerUserId} onClose={() => setDrawerUserId(null)} onRefresh={() => fetch_(search)} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// ROI Tab
// ─────────────────────────────────────────────────────────────────────
function RoiTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    adminFetch('/api/admin/roi-logs').then(r => r.json()).then(d => { setLogs(d.logs || []); setLoading(false) })
  }, [])

  const triggerManual = async () => {
    setTriggering(true)
    try {
      const res = await adminFetch('/api/admin/roi/run', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { toast.success(`ROI run: ${data.investmentsDone} processed · $${data.totalProfitPaid?.toFixed(2)} paid`); adminFetch('/api/admin/roi-logs').then(r => r.json()).then(d => setLogs(d.logs || [])) }
      else toast.error('ROI trigger failed — check server logs')
    } catch { toast.error('Failed to trigger ROI engine') }
    setTriggering(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h3 className="font-bold">Daily ROI Engine Logs</h3><p className="text-gray-500 text-sm">Runs hourly via Vercel Cron and credits each investment's daily installment once per day.</p></div>
        <button onClick={triggerManual} disabled={triggering} className="btn-gold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
          {triggering ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} Trigger Manual Run
        </button>
      </div>
      <div className="card-dark overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-40"><Spinner /></div> :
          logs.length === 0 ? <div className="text-center py-16 text-gray-600"><BarChart3 size={36} className="mx-auto mb-3 opacity-30" /><p>No ROI runs yet</p></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a14]"><tr>{['Run Time', 'Found', 'Processed', 'Total Paid', 'Errors'].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr></thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/2">
                    <td className="px-5 py-4 text-xs text-gray-400">{formatDate(log.processedAt)}</td>
                    <td className="px-5 py-4 text-sm font-medium">{log.investmentsFound}</td>
                    <td className="px-5 py-4 text-sm font-medium text-green-400">{log.investmentsDone}</td>
                    <td className="px-5 py-4 font-bold text-[#c9a84c] text-sm">{formatCurrency(log.totalProfitPaid)}</td>
                    <td className="px-5 py-4">{log.errors ? <span className="text-red-400 text-xs">{log.errors.slice(0, 60)}…</span> : <span className="text-green-400 text-xs">None</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Email Composer Tab
// ─────────────────────────────────────────────────────────────────────
function EmailTab() {
  const [users, setUsers] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [audience, setAudience] = useState<'all' | 'selected'>('selected')
  const [template, setTemplate] = useState<'random' | 'custom'>('random')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [recipientLimit, setRecipientLimit] = useState(500)

  useEffect(() => {
    adminFetch('/api/admin/email').then(response => response.json()).then(data => {
      setUsers(data.users || [])
      setRecipientLimit(data.recipientLimit || 500)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const toggleUser = (id: string) => setSelected(current => {
    if (current.includes(id)) return current.filter(item => item !== id)
    if (current.length >= recipientLimit) {
      toast.error(`Campaigns are capped at ${recipientLimit} recipients.`)
      return current
    }
    return [...current, id]
  })
  const selectAll = () => {
    if (selected.length === users.length) return setSelected([])
    const eligible = users.slice(0, recipientLimit).map(user => user.id)
    if (users.length > recipientLimit) toast.error(`Selected the first ${recipientLimit} recipients; campaigns are capped at ${recipientLimit}.`)
    setSelected(eligible)
  }

  const sendCampaign = async () => {
    if (audience === 'selected' && selected.length === 0) return toast.error('Select at least one recipient')
    if (template === 'custom' && (!subject.trim() || message.trim().length < 10)) return toast.error('Enter a subject and message of at least 10 characters')
    setSending(true)
    try {
      const response = await adminFetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, userIds: selected, template, subject, message }),
      })
      const data = await response.json()
      if (!response.ok) toast.error(data.error || 'Campaign failed')
      else toast.success(`${data.sent} email${data.sent === 1 ? '' : 's'} sent${data.failed ? ` · ${data.failed} failed` : ''}`)
    } catch { toast.error('Campaign failed') } finally { setSending(false) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div><h3 className="font-bold text-xl">Email Center</h3><p className="text-gray-500 text-sm mt-1">Send a randomized account update or custom branded message to all active users or selected recipients.</p></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card-dark p-6 space-y-5">
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Recipient group</label>{users.length > recipientLimit && <p className="mb-2 text-xs text-amber-300">There are {users.length} active recipients; an all-user campaign exceeds the {recipientLimit}-recipient cap and will be blocked without sending.</p>}<div className="grid grid-cols-2 gap-2">{(['selected', 'all'] as const).map(option => <button key={option} onClick={() => setAudience(option)} className={`py-3 rounded-xl border text-sm font-semibold ${audience === option ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]' : 'border-[#1e1e35] text-gray-400'}`}>{option === 'all' ? `All active users (${users.length})` : `Selected (${selected.length})`}</button>)}</div></div>
          <div><label className="block text-sm font-medium text-gray-300 mb-2">Message template</label><select value={template} onChange={event => setTemplate(event.target.value as 'random' | 'custom')} className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#c9a84c]"><option value="random">Randomized professional account update</option><option value="custom">Custom branded message</option></select></div>
          {template === 'custom' && <><div><label className="block text-sm font-medium text-gray-300 mb-2">Subject</label><input value={subject} onChange={event => setSubject(event.target.value)} maxLength={160} placeholder="Your AurexConnect update" className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" /></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Message</label><textarea value={message} onChange={event => setMessage(event.target.value)} rows={7} maxLength={5000} placeholder="Write a clear, professional message..." className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] resize-none" /></div></>}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-xs leading-relaxed">Campaigns are capped at {recipientLimit} recipients per send. Larger audiences are rejected before any email is sent; select a batch of {recipientLimit} or fewer. Randomized messages are personalized. Transactional emails are sent automatically.</div>
          <button onClick={sendCampaign} disabled={sending || (audience === 'selected' && selected.length === 0)} className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Mail size={16} /> Send email campaign</>}</button>
        </div>
        <div className="card-dark overflow-hidden"><div className="p-5 border-b border-[#1e1e35] flex items-center justify-between"><div><h4 className="font-bold">Active recipients</h4><p className="text-gray-500 text-xs mt-1">Only active investor accounts are listed.</p></div><button onClick={selectAll} className="text-xs text-[#c9a84c] hover:underline">{selected.length === users.length ? 'Clear all' : `Select up to ${recipientLimit}`}</button></div>{loading ? <div className="h-64 flex items-center justify-center"><Spinner /></div> : <div className="max-h-[520px] overflow-y-auto divide-y divide-[#1e1e35]">{users.map(user => <label key={user.id} className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer"><input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} className="accent-[#c9a84c]" /><span className="min-w-0"><span className="block text-sm text-white truncate">{user.fullName}</span><span className="block text-xs text-gray-500 truncate">{user.email}</span></span></label>)}{users.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No active users found.</div>}</div>}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Admin Settings — deposit methods and receiving addresses
// ─────────────────────────────────────────────────────────────────────
type PaymentMethod = { id: string; currency: string; label: string; address: string; network: string; isActive: boolean }
type PaymentMethodForm = { currency: string; label: string; address: string; network: string }
const emptyPaymentMethod: PaymentMethodForm = { currency: '', label: '', address: '', network: '' }

function SettingsTab() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PaymentMethodForm>(emptyPaymentMethod)

  const loadMethods = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminFetch('/api/admin/wallet-addresses')
      const data = await response.json()
      setMethods(response.ok && Array.isArray(data.methods) ? data.methods : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadMethods() }, [loadMethods])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyPaymentMethod)
  }

  const saveMethod = async (event: React.FormEvent) => {
    event.preventDefault()
    const currentMethod = editingId ? methods.find(method => method.id === editingId) : undefined
    if (currentMethod && (currentMethod.address !== form.address || currentMethod.network !== form.network)) {
      const confirmed = window.confirm('You are changing the deposit address or network shown to customers. Verify the new details carefully; incorrect deposit instructions can cause customers to lose funds. Continue?')
      if (!confirmed) return
    }
    setSaving(true)
    try {
      const response = await adminFetch('/api/admin/wallet-addresses', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Could not save payment method')
        return
      }
      toast.success(editingId ? 'Payment method updated' : 'Payment method added')
      resetForm()
      await loadMethods()
    } catch {
      toast.error('Could not save payment method')
    } finally {
      setSaving(false)
    }
  }

  const editMethod = (method: PaymentMethod) => {
    setEditingId(method.id)
    setForm({ currency: method.currency, label: method.label, address: method.address, network: method.network })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleMethod = async (method: PaymentMethod) => {
    try {
      const response = await adminFetch('/api/admin/wallet-addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: method.id, isActive: !method.isActive }),
      })
      const data = await response.json()
      if (!response.ok) return toast.error(data.error || 'Could not change payment method status')
      toast.success(data.method.isActive ? 'Payment method is now visible to users' : 'Payment method is hidden from new deposits')
      await loadMethods()
    } catch {
      toast.error('Could not change payment method status')
    }
  }

  const fieldClass = 'w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]'

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-xl font-bold">Website Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Manage the payment methods and deposit addresses displayed to customers. Only active methods appear on the deposit page; changes apply to new deposit submissions.</p>
      </div>

      <div className="grid xl:grid-cols-[minmax(320px,0.8fr)_1.2fr] gap-5 items-start">
        <form onSubmit={saveMethod} className="card-dark p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="font-bold">{editingId ? 'Edit payment method' : 'Add payment method'}</h3><p className="text-xs text-gray-500 mt-1">Use a unique code such as BTC or USDT-TRC20.</p></div>
            {editingId && <button type="button" onClick={resetForm} className="text-xs text-gray-400 hover:text-white">Cancel</button>}
          </div>
          <label className="block"><span className="block text-xs text-gray-400 mb-2">Method code</span><input required maxLength={20} value={form.currency} onChange={event => setForm(current => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder="e.g. BTC or USDT-TRC20" className={fieldClass} /></label>
          <label className="block"><span className="block text-xs text-gray-400 mb-2">Display name</span><input required maxLength={80} value={form.label} onChange={event => setForm(current => ({ ...current, label: event.target.value }))} placeholder="e.g. Tether (TRC20)" className={fieldClass} /></label>
          <label className="block"><span className="block text-xs text-gray-400 mb-2">Network</span><input required maxLength={64} value={form.network} onChange={event => setForm(current => ({ ...current, network: event.target.value }))} placeholder="e.g. Bitcoin, Ethereum, TRC20" className={fieldClass} /></label>
          <label className="block"><span className="block text-xs text-gray-400 mb-2">Deposit address</span><textarea required minLength={8} maxLength={300} rows={3} value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} placeholder="Enter the address users should send funds to" className={`${fieldClass} resize-y font-mono`} /></label>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs leading-relaxed text-yellow-200">Double-check the address and network before saving. An incorrect address may cause customer funds to be lost. Deactivate a method to hide it from new deposits without deleting it.</div>
          <button type="submit" disabled={saving} className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Save size={15} /> : <PlusCircle size={15} />}
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add payment method'}
          </button>
        </form>

        <div className="card-dark overflow-hidden">
          <div className="p-5 border-b border-[#1e1e35] flex items-center justify-between gap-3"><div><h3 className="font-bold">Payment methods</h3><p className="text-gray-500 text-xs mt-1">{methods.filter(method => method.isActive).length} active · {methods.length} total</p></div><button type="button" onClick={() => void loadMethods()} className="text-xs text-[#c9a84c] hover:underline">Refresh</button></div>
          {loading ? <div className="h-40 flex items-center justify-center"><Spinner /></div> : methods.length === 0 ? <div className="p-10 text-center"><Wallet size={30} className="mx-auto mb-3 text-gray-600" /><p className="text-sm text-gray-300">No payment methods configured</p><p className="text-xs text-gray-500 mt-1">Add a method to make it available on the user deposit page.</p></div> : <div className="divide-y divide-[#1e1e35]">
            {methods.map(method => (
              <div key={method.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><h4 className="font-semibold">{method.label}</h4><code className="rounded bg-[#0a0a14] px-2 py-0.5 text-[11px] text-[#c9a84c]">{method.currency}</code><span className={`text-[10px] px-2 py-0.5 rounded-full ${method.isActive ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'}`}>{method.isActive ? 'Active' : 'Hidden'}</span></div><p className="text-xs text-gray-500 mt-1">Network: {method.network}</p></div>
                  <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => editMethod(method)} className="rounded-lg border border-[#1e1e35] px-3 py-2 text-xs text-gray-300 hover:text-white">Edit</button><button type="button" onClick={() => void toggleMethod(method)} className={`rounded-lg border px-3 py-2 text-xs ${method.isActive ? 'border-red-500/30 text-red-300 hover:bg-red-400/10' : 'border-green-500/30 text-green-300 hover:bg-green-400/10'}`}>{method.isActive ? 'Deactivate' : 'Activate'}</button></div>
                </div>
                <div className="rounded-lg bg-[#0a0a14] border border-[#1e1e35] px-3 py-2"><span className="block text-[10px] uppercase tracking-wider text-gray-600 mb-1">Address</span><code className="block break-all text-xs text-gray-300">{method.address}</code></div>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { adminFetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) }) }, [])
  if (loading) return <div className="flex items-center justify-center h-40"><Spinner /></div>
  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: '#c9a84c' },
    { label: 'Total Deposits', value: formatCurrency(stats?.totalDeposits ?? 0), icon: ArrowDownCircle, color: '#60a5fa' },
    { label: 'Total Withdrawals', value: formatCurrency(stats?.totalWithdrawals ?? 0), icon: ArrowUpCircle, color: '#f87171' },
    { label: 'Total Profit Paid', value: formatCurrency(stats?.totalProfit ?? 0), icon: TrendingUp, color: '#34d399' },
    { label: 'Pending Deposits', value: stats?.pendingDeposits ?? 0, icon: Clock, color: '#fbbf24' },
    { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals ?? 0, icon: Clock, color: '#fb923c' },
    { label: 'Pending KYC', value: stats?.pendingKyc ?? 0, icon: FileCheck, color: '#a78bfa' },
    { label: 'Active Investments', value: stats?.activeInvestments ?? 0, icon: BarChart3, color: '#2dd4bf' },
  ]
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card-dark p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-gray-500 text-xs uppercase tracking-wider">{label}</div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}><Icon size={18} style={{ color }} /></div>
            </div>
            <div className="text-2xl font-black" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>
      {(stats?.pendingDeposits > 0 || stats?.pendingWithdrawals > 0 || stats?.pendingKyc > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-yellow-400" /><span className="font-bold text-yellow-400 text-sm">Action Required</span></div>
          <div className="space-y-1.5 text-sm text-gray-400">
            {stats?.pendingDeposits > 0 && <div>→ <strong className="text-white">{stats.pendingDeposits}</strong> deposit{stats.pendingDeposits !== 1 ? 's' : ''} awaiting approval</div>}
            {stats?.pendingWithdrawals > 0 && <div>→ <strong className="text-white">{stats.pendingWithdrawals}</strong> withdrawal{stats.pendingWithdrawals !== 1 ? 's' : ''} awaiting processing</div>}
            {stats?.pendingKyc > 0 && <div>→ <strong className="text-white">{stats.pendingKyc}</strong> KYC submission{stats.pendingKyc !== 1 ? 's' : ''} awaiting review</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Main Admin Page
// ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/dashboard')
  }, [status, session, router])

  if (status === 'loading' || status === 'unauthenticated' || session?.user?.role !== 'ADMIN' || !session.user.isActive) return <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" /></div>

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownCircle },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
    { id: 'kyc', label: 'KYC Review', icon: FileCheck },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roi', label: 'ROI Engine', icon: TrendingUp },
    { id: 'email', label: 'Email Center', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="border-b border-[#1e1e35] bg-[#12121f] px-8 py-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><Shield size={18} className="text-purple-400" /></div>
          <div><div className="text-purple-400 text-xs font-semibold uppercase tracking-widest">Admin dashboard</div><h1 className="text-xl font-black">AurexConnect Operations</h1></div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-sm text-gray-400 hover:text-white border border-[#1e1e35] px-4 py-2 rounded-xl hover:border-[#c9a84c]/40 transition-all">View public site</a>
          <button onClick={() => signOut({ callbackUrl: '/auth/login' })} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-[#1e1e35] px-4 py-2 rounded-xl hover:border-red-400/40 hover:text-red-300 transition-all" aria-label="Log out of admin dashboard">
            <LogOut size={15} /> Log out
          </button>
        </div>
      </div>

      <div className="border-b border-[#1e1e35] bg-[#12121f] px-8 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === id ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'deposits' && <DepositsTab />}
        {activeTab === 'withdrawals' && <WithdrawalsTab />}
        {activeTab === 'kyc' && <KycTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'roi' && <RoiTab />}
        {activeTab === 'email' && <EmailTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
