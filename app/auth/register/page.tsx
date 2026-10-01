'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', country: '', referralCode: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Registration failed')
      } else {
        toast.success('Account created! Please sign in.')
        router.push('/auth/login')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const inputClass = "w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors"

  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      <div className="hidden lg:flex lg:w-5/12 bg-[#12121f] border-r border-[#1e1e35] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'linear-gradient(#c9a84c 1px,transparent 1px),linear-gradient(90deg,#c9a84c 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#c9a84c]/5 rounded-full blur-3xl" />
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
            <TrendingUp size={18} className="text-[#0a0a14]" />
          </div>
          <span className="text-xl font-bold"><span className="gold-text">Aurex</span>Connect</span>
        </Link>
        <div className="relative z-10 space-y-6">
                  <h2 className="text-4xl font-black leading-tight">Join 14,000+<br /><span className="gold-text">smart investors</span></h2>
          <div className="space-y-3">
                    {['Up to 120% total ROI','Plans from 24 hours to 1 month','Withdraw earnings anytime','5% referral bonus on every plan'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0a0a14] text-xs font-black">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="text-gray-600 text-xs relative z-10">© 2025 AurexConnect</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
              <TrendingUp size={18} className="text-[#0a0a14]" />
            </div>
            <span className="text-xl font-bold"><span className="gold-text">Aurex</span>Connect</span>
          </div>

          <h1 className="text-3xl font-black mb-2">Create your account</h1>
          <p className="text-gray-500 mb-8">Start earning returns today</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
              <input type="text" required value={form.fullName} onChange={set('fullName')}
                placeholder="John Doe" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="you@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={set('password')} placeholder="Min. 8 characters" className={`${inputClass} pr-12`} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="+1 234 567 8900" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <input type="text" value={form.country} onChange={set('country')}
                  placeholder="United States" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Referral Code (Optional)</label>
              <input type="text" value={form.referralCode} onChange={set('referralCode')}
                placeholder="Enter referral code" className={inputClass} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating Account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#c9a84c] hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
