'use client'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('verified') === '1') toast.success('Email verified. You can now sign in.')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#12121f] border-r border-[#1e1e35] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'linear-gradient(#c9a84c 1px,transparent 1px),linear-gradient(90deg,#c9a84c 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c9a84c]/5 rounded-full blur-3xl" />
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
            <TrendingUp size={18} className="text-[#0a0a14]" />
          </div>
          <span className="text-xl font-bold"><span className="gold-text">Aurex</span>Connect</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-4 leading-tight">
            Your investments,<br /><span className="gold-text">always working.</span>
          </h2>
          <p className="text-gray-500 leading-relaxed">
            Log in to monitor your portfolio, make deposits, and track your returns in real time.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[['$48M+','Paid Out'],['14K+','Active Investors'],['99.9%','Uptime'],['4 Plans','Available']].map(([val, label]) => (
              <div key={label} className="card-dark p-4 rounded-xl">
                <div className="text-2xl font-black gold-text">{val}</div>
                <div className="text-gray-500 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-gray-600 text-xs relative z-10">© 2025 AurexConnect. All rights reserved.</div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
              <TrendingUp size={18} className="text-[#0a0a14]" />
            </div>
            <span className="text-xl font-bold"><span className="gold-text">Aurex</span>Connect</span>
          </div>

          <h1 className="text-3xl font-black mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">Sign in to your investor account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[#12121f] border border-[#1e1e35] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors pr-12"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link href="/auth/forgot-password" className="text-xs text-[#c9a84c] hover:underline">Forgot password?</Link>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-[#c9a84c] hover:underline font-medium">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
