'use client'
import { useEffect, useState } from 'react'
import { Copy, CheckCircle, Upload, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

type PaymentMethod = { id: string; currency: string; label: string; address: string; network: string; updatedAt: string }
const CURRENCY_SYMBOLS: Record<string, string> = { BTC: '₿', XBT: '₿', ETH: 'Ξ', USDT: '₮', USDC: '$', XRP: '✕', LTC: 'Ł', SOL: '◎', DOGE: 'Ð' }

function symbolFor(currency: string) {
  const baseCode = currency.split(/[-_]/)[0]
  return CURRENCY_SYMBOLS[baseCode] || '◇'
}

export default function DepositPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [methodsError, setMethodsError] = useState('')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const selected = methods.find(method => method.id === selectedId) || methods[0]

  useEffect(() => {
    let cancelled = false
    fetch('/api/payment-methods')
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load payment methods')
        if (cancelled) return
        const activeMethods = Array.isArray(data.methods) ? data.methods : []
        setMethods(activeMethods)
        setSelectedId(activeMethods[0]?.id || '')
      })
      .catch(error => {
        if (!cancelled) setMethodsError(error instanceof Error ? error.message : 'Could not load payment methods')
      })
      .finally(() => { if (!cancelled) setMethodsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const copy = async () => {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(selected.address)
      setCopied(true)
      toast.success('Address copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the address. Please select and copy it manually.')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected) return toast.error('No active payment method is available')
    if (!amount || Number(amount) < 10 || !txHash.trim()) return toast.error('Enter an amount of at least $10 and your transaction hash')
    setSubmitting(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DEPOSIT', amount: Number(amount), currency: selected.currency, paymentMethodId: selected.id, paymentMethodUpdatedAt: selected.updatedAt, txHash: txHash.trim() }),
      })
      const data = await response.json()
      if (!response.ok) return toast.error(data.error || 'Deposit submission failed')
      toast.success('Deposit submitted for review!')
      setAmount('')
      setTxHash('')
    } catch {
      toast.error('Deposit submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-black mb-1">Make a Deposit</h1>
        <p className="text-gray-500 text-sm">Send funds using an active payment method below and submit your transaction hash for verification.</p>
      </div>

      <div className="card-dark p-6">
        <h2 className="font-bold mb-4">Select Payment Method</h2>
        {methodsLoading ? <div className="py-8 text-center text-sm text-gray-500">Loading available payment methods…</div> : methodsError ? <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{methodsError}. Please refresh the page or contact support.</div> : methods.length === 0 ? <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 text-center"><Wallet size={26} className="mx-auto mb-2 text-yellow-300" /><p className="text-sm font-semibold text-gray-200">No payment methods are currently available</p><p className="text-xs text-gray-500 mt-1">Please check back later or contact support.</p></div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {methods.map(method => (
            <button key={method.id} type="button" onClick={() => setSelectedId(method.id)} className={`p-4 rounded-xl border text-center transition-all ${selected?.id === method.id ? 'border-[#c9a84c] bg-[#c9a84c]/10' : 'border-[#1e1e35] hover:border-[#c9a84c]/40'}`}>
              <div className="text-2xl mb-1">{symbolFor(method.currency)}</div>
              <div className="text-xs font-bold">{method.currency}</div>
              <div className="text-gray-500 text-xs mt-1">{method.label}</div>
              <div className="text-gray-600 text-[10px] mt-1">{method.network}</div>
            </button>
          ))}
        </div>}
      </div>

      {selected && !methodsLoading && !methodsError && (
        <>
          <div className="card-dark p-6">
            <h2 className="font-bold mb-1">Send {selected.label} to this address</h2>
            <p className="text-gray-500 text-xs mb-4">Only send {selected.currency} using the {selected.network} network to this address. Sending the wrong asset or network may result in lost funds.</p>

            <div className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl p-4 flex items-center gap-3 mb-4">
              <code className="flex-1 text-[#c9a84c] text-sm font-mono break-all">{selected.address}</code>
              <button type="button" onClick={copy} aria-label="Copy payment address" className="flex-shrink-0 text-gray-400 hover:text-[#c9a84c] transition-colors">
                {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-400 text-xs">
              <strong>Minimum deposit: $10.</strong> Deposits are credited after an administrator verifies the transaction.
            </div>
          </div>

          <div className="card-dark p-6">
            <h2 className="font-bold mb-4">Confirm Your Deposit</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
                <input type="number" min="10" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="e.g. 500" className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Hash / ID</label>
                <input type="text" required minLength={5} value={txHash} onChange={event => setTxHash(event.target.value)} placeholder="Paste your transaction hash here" className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors" />
              </div>
              <button type="submit" disabled={submitting || methodsLoading || methods.length === 0} className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {submitting ? 'Submitting...' : <><Upload size={16} /> Submit Deposit</>}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
