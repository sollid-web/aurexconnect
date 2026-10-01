'use client'
import { useState } from 'react'
import { Copy, CheckCircle, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const WALLETS = [
  { currency: 'BTC', name: 'Bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', icon: '₿' },
  { currency: 'ETH', name: 'Ethereum', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', icon: 'Ξ' },
  { currency: 'USDT', name: 'Tether (TRC20)', address: 'TN3W4T8AYBFn9NkqL3b4W8ZkbPbXsAcRsM', icon: '₮' },
]

export default function DepositPage() {
  const [selected, setSelected] = useState(WALLETS[0])
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(selected.address)
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !txHash) return toast.error('Please fill all fields')
    setSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DEPOSIT', amount: Number(amount), currency: selected.currency, txHash: txHash.trim() }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Deposit submission failed')
      toast.success('Deposit submitted for review!')
      setAmount('')
      setTxHash('')
    } catch {
      toast.error('Deposit submission failed. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-black mb-1">Make a Deposit</h1>
        <p className="text-gray-500 text-sm">Send crypto to the address below and submit your transaction hash for verification.</p>
      </div>

      {/* Select currency */}
      <div className="card-dark p-6">
        <h2 className="font-bold mb-4">Select Payment Method</h2>
        <div className="grid grid-cols-3 gap-3">
          {WALLETS.map(w => (
            <button key={w.currency} onClick={() => setSelected(w)}
              className={`p-4 rounded-xl border text-center transition-all ${selected.currency === w.currency
                ? 'border-[#c9a84c] bg-[#c9a84c]/10' : 'border-[#1e1e35] hover:border-[#c9a84c]/40'}`}>
              <div className="text-2xl mb-1">{w.icon}</div>
              <div className="text-xs font-bold">{w.currency}</div>
              <div className="text-gray-500 text-xs">{w.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet address */}
      <div className="card-dark p-6">
        <h2 className="font-bold mb-1">Send {selected.name} to this address</h2>
        <p className="text-gray-500 text-xs mb-4">Only send {selected.currency} to this address. Wrong network = lost funds.</p>

        <div className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl p-4 flex items-center gap-3 mb-4">
          <code className="flex-1 text-[#c9a84c] text-sm font-mono break-all">{selected.address}</code>
          <button onClick={copy} className="flex-shrink-0 text-gray-400 hover:text-[#c9a84c] transition-colors">
            {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-400 text-xs">
          ⚠️ Minimum deposit: <strong>$50</strong>. Deposits are confirmed within 30 minutes after network confirmation.
        </div>
      </div>

      {/* Confirm deposit */}
      <div className="card-dark p-6">
        <h2 className="font-bold mb-4">Confirm Your Deposit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
            <input type="number" min="50" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Hash / ID</label>
            <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)}
              placeholder="Paste your transaction hash here"
              className="w-full bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors" />
          </div>
          <button type="submit" disabled={submitting}
            className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            {submitting ? 'Submitting...' : <><Upload size={16} /> Submit Deposit</>}
          </button>
        </form>
      </div>
    </div>
  )
}
