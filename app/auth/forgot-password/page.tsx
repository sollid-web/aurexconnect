'use client'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await response.json()
      if (!response.ok) toast.error(data.error)
      else toast.success(data.message)
    } catch { toast.error('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }
  return <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-6 text-white"><div className="w-full max-w-md"><Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8"><ArrowLeft size={16} /> Back to sign in</Link><div className="flex items-center gap-2 mb-8"><div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center"><TrendingUp size={18} className="text-[#0a0a14]" /></div><span className="text-xl font-bold"><span className="gold-text">Aurex</span>Connect</span></div><h1 className="text-3xl font-black mb-2">Forgot your password?</h1><p className="text-gray-500 mb-8">Enter your email and we’ll send a secure password reset link.</p><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium text-gray-300">Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c]" placeholder="you@example.com" /></label><button disabled={loading} className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2">{loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Send reset link</button></form></div></div>
}
