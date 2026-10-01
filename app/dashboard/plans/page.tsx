'use client'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  TrendingUp, CheckCircle, Loader2, Clock, ArrowRight,
  DollarSign, BarChart3, Shield, X, AlertTriangle, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { durationLabel, formatUsd } from '@/lib/plans'

interface Plan {
  id: string
  name: string
  roiPercent: number
  minAmount: number
  maxAmount: number | null
  durationDays: number
  referralBonus: number
  features: string[]
  description?: string
}

interface Investment {
  id: string
  amount: number
  expectedProfit: number
  roiPaid?: number
  status: string
  startDate: string
  endDate: string
  progress: number
  daysLeft: number
  plan: Plan
}

const PLAN_PALETTE: Record<string, { accent: string; glow: string; badge: string }> = {
  'Gold Plan': { accent: '#c9a84c', glow: 'rgba(201,168,76,0.12)', badge: 'bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/30' },
  'Silver Plan': { accent: '#cbd5e1', glow: 'rgba(203,213,225,0.08)', badge: 'bg-slate-400/15 text-slate-300 border-slate-400/30' },
  'Bronze Plan': { accent: '#d7875f', glow: 'rgba(215,135,95,0.10)', badge: 'bg-orange-400/15 text-orange-300 border-orange-400/30' },
  'Diamond Plan': { accent: '#7dd3fc', glow: 'rgba(125,211,252,0.12)', badge: 'bg-sky-400/15 text-sky-300 border-sky-400/30' },
}

function getPalette(name: string) {
  return PLAN_PALETTE[name] ?? PLAN_PALETTE['Gold Plan']
}

// ── Purchase Confirmation Modal ──────────────────────────────────────
function PurchaseModal({
  plan, amount, balance, onConfirm, onClose, loading
}: {
  plan: Plan
  amount: number
  balance: number
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  const profit = (amount * plan.roiPercent) / 100
  const total = amount + profit
  const palette = getPalette(plan.name)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121f] border border-[#1e1e35] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1e1e35]">
          <div>
            <h3 className="font-bold text-lg">Confirm Investment</h3>
            <p className="text-gray-500 text-sm mt-0.5">{plan.name}</p>
          </div>
          <button onClick={onClose} disabled={loading}
            className="text-gray-500 hover:text-white disabled:opacity-30">
            <X size={20} />
          </button>
        </div>

        {/* Summary */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${palette.accent}30`, background: palette.glow }}>
            {[
              ['Investment Amount', formatCurrency(amount), palette.accent],
              [`Total Expected ROI (${plan.roiPercent}%)`, `+${formatCurrency(profit)}`, '#34d399'],
              ['Total Return', formatCurrency(total), '#fff'],
              [`Duration`, `${plan.durationDays} day${plan.durationDays > 1 ? 's' : ''}`, '#9ca3af'],
              ['Referral Bonus', `${plan.referralBonus}%`, '#9ca3af'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="font-bold" style={{ color: color as string }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-sm bg-[#0a0a14] rounded-xl px-4 py-3 border border-[#1e1e35]">
            <span className="text-gray-400">Balance After Purchase</span>
            <span className={`font-bold ${balance - amount < 0 ? 'text-red-400' : 'text-white'}`}>
              {formatCurrency(balance - amount)}
            </span>
          </div>

          {balance - amount < 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-xs">Insufficient balance. Please deposit more funds.</span>
            </div>
          )}

          <p className="text-gray-500 text-xs leading-relaxed">
            By confirming, you agree that ${ amount.toFixed(2)} will be deducted from your balance and invested in the {plan.name}. Your ROI is credited daily, and your principal is returned when the plan matures.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-xl border border-[#1e1e35] text-gray-400 hover:text-white text-sm transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading || balance < amount}
            className="flex-1 btn-gold py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
              : <><Zap size={14} /> Confirm Investment</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Investment progress card ─────────────────────────────────────────
function InvestmentCard({ inv }: { inv: Investment }) {
  const palette = getPalette(inv.plan.name)
  const isComplete = inv.status === 'COMPLETED'

  return (
    <div className="card-dark p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: isComplete ? '#34d399' : palette.accent }} />
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: palette.accent }}>
            {inv.plan.name}
          </div>
          <div className="text-xl font-black">{formatCurrency(inv.amount)}</div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
          isComplete ? 'bg-green-400/10 text-green-400 border-green-400/30' : 'bg-blue-400/10 text-blue-400 border-blue-400/30'
        }`}>
          {isComplete ? '✓ Completed' : 'Active'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{inv.progress}% complete</span>
          <span>{isComplete ? 'Matured' : `${inv.daysLeft}d remaining`}</span>
        </div>
        <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${inv.progress}%`, background: isComplete ? '#34d399' : palette.accent }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#0a0a14] rounded-lg p-3">
          <div className="text-gray-500 mb-0.5">ROI Paid / Expected</div>
          <div className="font-bold text-green-400">+{formatCurrency(inv.roiPaid || 0)} / {formatCurrency(inv.expectedProfit)}</div>
        </div>
        <div className="bg-[#0a0a14] rounded-lg p-3">
          <div className="text-gray-500 mb-0.5">{isComplete ? 'Completed' : 'Matures On'}</div>
          <div className="font-bold text-sm">
            {new Date(inv.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [amount, setAmount] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [activeTab, setActiveTab] = useState<'plans' | 'active'>('plans')

  useEffect(() => {
    Promise.all([
      fetch('/api/plans').then(r => r.json()),
      fetch('/api/investments').then(r => r.json()),
      fetch('/api/user/me').then(r => r.json()),
    ]).then(([p, inv, user]) => {
      setPlans(p)
      setInvestments(Array.isArray(inv) ? inv : [])
      setBalance(user.balance || 0)
      setLoading(false)
    })
  }, [])

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setAmount(String(plan.minAmount))
    setActiveTab('plans')
    // Scroll to amount input
    setTimeout(() => document.getElementById('amount-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  const handleOpenModal = () => {
    const num = parseFloat(amount)
    if (!selectedPlan) return toast.error('Please select a plan')
    if (!num || isNaN(num)) return toast.error('Enter a valid amount')
    if (num < selectedPlan.minAmount) return toast.error(`Minimum is ${formatCurrency(selectedPlan.minAmount)}`)
    if (selectedPlan.maxAmount !== null && num > selectedPlan.maxAmount) return toast.error(`Maximum is ${formatCurrency(selectedPlan.maxAmount)}`)
    if (balance < num) return toast.error('Insufficient balance — please deposit first')
    setShowModal(true)
  }

  const handleConfirmPurchase = async () => {
    if (!selectedPlan) return
    setPurchasing(true)
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id, amount: parseFloat(amount) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
      } else {
        toast.success(`🚀 Investment of ${formatCurrency(parseFloat(amount))} in ${selectedPlan.name} activated!`)
        setShowModal(false)
        setSelectedPlan(null)
        setAmount('')
        setBalance(b => b - parseFloat(amount))
        // Refresh investments
        fetch('/api/investments').then(r => r.json()).then(inv => {
          setInvestments(Array.isArray(inv) ? inv : [])
          setActiveTab('active')
        })
      }
    } catch {
      toast.error('Purchase failed. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
    </div>
  )

  const activeInvestments = investments.filter(i => i.status === 'ACTIVE')
  const completedInvestments = investments.filter(i => i.status === 'COMPLETED')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black mb-1">Investment Plans</h1>
          <p className="text-gray-500 text-sm">Select a plan, enter your amount, and start earning.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Available Balance</div>
            <div className="text-xl font-black gold-text">{formatCurrency(balance)}</div>
          </div>
          {balance < 50 && (
            <Link href="/dashboard/deposit"
              className="btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
              <DollarSign size={13} /> Deposit
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#12121f] border border-[#1e1e35] rounded-xl p-1 w-fit">
        {[
          { id: 'plans', label: 'Buy a Plan' },
          { id: 'active', label: `My Investments (${activeInvestments.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-[#c9a84c] text-[#0a0a14]' : 'text-gray-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PLANS TAB ───────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* Plan cards */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map((plan, i) => {
              const palette = getPalette(plan.name)
              const isSelected = selectedPlan?.id === plan.id
              const canAfford = balance >= plan.minAmount

              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`card-dark p-6 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 relative overflow-hidden ${
                    isSelected
                      ? 'shadow-xl'
                      : 'hover:border-white/10'
                  }`}
                  style={isSelected ? {
                    borderColor: `${palette.accent}60`,
                    boxShadow: `0 0 40px ${palette.glow}`,
                  } : {}}
                >
                  {/* Top accent bar */}
                  {isSelected && (
                    <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: palette.accent }} />
                  )}

                  {i === 1 && (
                    <div className="absolute top-3 right-3 text-[#0a0a14] text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: palette.accent }}>
                      POPULAR
                    </div>
                  )}

                  {/* Can't afford warning */}
                  {!canAfford && (
                    <div className="absolute top-3 left-3 bg-gray-800/90 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                      Need {formatCurrency(plan.minAmount)}
                    </div>
                  )}

                  <div className="mb-5 pt-2">
                    <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: palette.accent }}>
                      {plan.name}
                    </div>
                    <div className="text-5xl font-black leading-none" style={{ color: palette.accent }}>
                      {plan.roiPercent}%
                    </div>
                    <div className="text-gray-500 text-xs mt-1.5">
                      ROI in {durationLabel(plan.durationDays)}
                    </div>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-5">
                    {[
                      `Min: ${formatCurrency(plan.minAmount)}`,
                      `Max: ${formatUsd(plan.maxAmount)}`,
                      `Duration: ${durationLabel(plan.durationDays)}`,
                      `Referral: ${plan.referralBonus}%`,
                      `Profit on min: ${formatCurrency(plan.minAmount * plan.roiPercent / 100)}`,
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle size={11} style={{ color: palette.accent }} className="flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div
                    className={`w-full text-center py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'text-[#0a0a14]'
                        : 'border-[#1e1e35] text-gray-400'
                    }`}
                    style={isSelected ? { background: palette.accent, borderColor: palette.accent } : {}}
                  >
                    {isSelected ? '✓ Selected' : 'Select Plan'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Amount input + purchase CTA */}
          {selectedPlan && (
            <div id="amount-input" className="card-dark p-6 max-w-xl border-[#c9a84c]/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: getPalette(selectedPlan.name).glow }}>
                  <TrendingUp size={18} style={{ color: getPalette(selectedPlan.name).accent }} />
                </div>
                <div>
                  <div className="font-bold">{selectedPlan.name}</div>
                  <div className="text-gray-500 text-xs">
                    {selectedPlan.roiPercent}% ROI · {durationLabel(selectedPlan.durationDays)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="font-medium text-gray-300">Investment Amount (USD)</label>
                    <span className="text-gray-500 text-xs">
                      {formatUsd(selectedPlan.minAmount)} – {formatUsd(selectedPlan.maxAmount)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      value={amount}
                      min={selectedPlan.minAmount}
                      max={selectedPlan.maxAmount ?? undefined}
                      onChange={e => setAmount(e.target.value)}
                      placeholder={String(selectedPlan.minAmount)}
                      className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors"
                    />
                  </div>

                  {/* Quick amount buttons */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[selectedPlan.minAmount, selectedPlan.minAmount * 2, selectedPlan.minAmount * 5, selectedPlan.maxAmount].filter((v): v is number => v !== null && (selectedPlan.maxAmount === null || v <= selectedPlan.maxAmount)).map(v => (
                      (
                        <button key={v} onClick={() => setAmount(String(v))}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            parseFloat(amount) === v
                              ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                              : 'border-[#1e1e35] text-gray-500 hover:text-gray-300 hover:border-gray-500'
                          }`}>
                          {formatCurrency(v)}
                        </button>
                      )
                    ))}
                  </div>
                </div>

                {/* Live profit preview */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-[#0a0a14] rounded-xl border border-[#1e1e35] p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Return Preview</div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">You Invest</div>
                        <div className="font-bold text-sm">{formatCurrency(parseFloat(amount) || 0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Profit</div>
                        <div className="font-bold text-sm text-green-400">
                          +{formatCurrency((parseFloat(amount) || 0) * selectedPlan.roiPercent / 100)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">You Get Back</div>
                        <div className="font-bold text-sm text-[#c9a84c]">
                          {formatCurrency((parseFloat(amount) || 0) * (1 + selectedPlan.roiPercent / 100))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {balance < parseFloat(amount || '0') && (
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-yellow-400 text-xs">
                      You need {formatCurrency(parseFloat(amount || '0') - balance)} more.{' '}
                      <Link href="/dashboard/deposit" className="underline font-semibold">Deposit now →</Link>
                    </span>
                  </div>
                )}

                <button
                  onClick={handleOpenModal}
                  disabled={!amount || parseFloat(amount) < selectedPlan.minAmount || balance < parseFloat(amount || '0')}
                  className="btn-gold w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  <ArrowRight size={16} /> Review & Confirm Investment
                </button>
              </div>
            </div>
          )}

          {!selectedPlan && (
            <div className="text-center py-6 text-gray-600 text-sm">
              ↑ Click a plan above to select it and enter your investment amount
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVE INVESTMENTS TAB ──────────────────────────────── */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {activeInvestments.length === 0 && completedInvestments.length === 0 ? (
            <div className="card-dark p-16 text-center">
              <TrendingUp size={48} className="mx-auto mb-4 text-gray-700" />
              <h3 className="font-bold text-lg mb-2">No investments yet</h3>
              <p className="text-gray-500 text-sm mb-5">Choose a plan and make your first investment to start earning.</p>
              <button onClick={() => setActiveTab('plans')} className="btn-gold px-6 py-2.5 rounded-xl text-sm">
                Browse Plans
              </button>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Active Investments',
                    value: activeInvestments.length,
                    sub: formatCurrency(activeInvestments.reduce((a, i) => a + i.amount, 0)) + ' invested',
                    color: '#60a5fa',
                  },
                  {
                    label: 'Pending Profit',
                    value: formatCurrency(activeInvestments.reduce((a, i) => a + i.expectedProfit, 0)),
                    sub: 'expected return',
                    color: '#34d399',
                  },
                  {
                    label: 'All-Time Profit',
                    value: formatCurrency(completedInvestments.reduce((a, i) => a + i.expectedProfit, 0)),
                    sub: `from ${completedInvestments.length} completed`,
                    color: '#c9a84c',
                  },
                ].map(s => (
                  <div key={s.label} className="card-dark p-5">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Active investments grid */}
              {activeInvestments.length > 0 && (
                <div>
                  <h2 className="font-bold mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" /> Active
                  </h2>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeInvestments.map(inv => <InvestmentCard key={inv.id} inv={inv} />)}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedInvestments.length > 0 && (
                <div>
                  <h2 className="font-bold mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" /> Completed
                  </h2>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {completedInvestments.map(inv => <InvestmentCard key={inv.id} inv={inv} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Purchase confirmation modal */}
      {showModal && selectedPlan && (
        <PurchaseModal
          plan={selectedPlan}
          amount={parseFloat(amount)}
          balance={balance}
          onConfirm={handleConfirmPurchase}
          onClose={() => !purchasing && setShowModal(false)}
          loading={purchasing}
        />
      )}
    </div>
  )
}
