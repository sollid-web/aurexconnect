'use client'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Lock, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const router = useRouter(); const [token, setToken] = useState('')
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get('token') || '') }, [])
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (password !== confirm) return toast.error('Passwords do not match'); setLoading(true); try { const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) }); const data = await response.json(); if (!response.ok) toast.error(data.error); else { toast.success(data.message); router.push('/auth/login') } } catch { toast.error('Something went wrong. Please try again.') } finally { setLoading(false) } }
  return <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-6 text-white"><div className="w-full max-w-md"><div className="flex items-center gap-2 mb-8"><div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center"><TrendingUp size={18} className="text-[#0a0a14]" /></div><span className="text-xl font-bold"><span className="gold-text">Aurex</span>Connect</span></div><h1 className="text-3xl font-black mb-2">Set a new password</h1><p className="text-gray-500 mb-8">Choose a strong password for your investor account.</p><form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium text-gray-300">New password<input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#c9a84c]" /></label><label className="block text-sm font-medium text-gray-300">Confirm password<input type="password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#c9a84c]" /></label><button disabled={loading || !token} className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2">{loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />} Update password</button></form><Link href="/auth/login" className="block text-center text-sm text-[#c9a84c] mt-6">Back to sign in</Link></div></div>
}
