'use client'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import { Receipt } from 'lucide-react'
import { formatApx } from '@/lib/apx'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetch('/api/transactions').then(r => r.json()).then(d => { setTransactions(d); setLoading(false) })
  }, [])

  const filtered = filter === 'ALL' ? transactions : transactions.filter(t => t.type === filter)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black mb-1">Transaction History</h1>
        <p className="text-gray-500 text-sm">All your deposits, withdrawals, and earnings</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL','DEPOSIT','WITHDRAWAL','PROFIT','REFERRAL_BONUS'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${filter === f
              ? 'bg-[#c9a84c] text-[#0a0a14]' : 'bg-[#12121f] border border-[#1e1e35] text-gray-400 hover:text-white'}`}>
            {f.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-dark overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Receipt size={40} className="mx-auto mb-3 opacity-30" />
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0a0a14] border-b border-[#1e1e35]">
                <tr>
                  {['Type','Amount','Status','Date','Note'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e35]">
                {filtered.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium capitalize">{tx.type.replace(/_/g,' ').toLowerCase()}</td>
                    <td className="px-6 py-4 text-sm font-bold">{tx.currency === 'APX' ? formatApx(tx.amount) : formatCurrency(tx.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{formatDate(tx.createdAt)}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">{tx.note || '—'}</td>
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
