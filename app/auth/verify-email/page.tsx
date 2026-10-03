'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck, ShieldAlert } from 'lucide-react'

export default function VerifyEmailPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setError('This verification link is missing its security token.')
      return
    }

    // Keep the verification logic server-side and preserve support for links
    // already sent with the /auth/verify-email path.
    window.location.replace(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
  }, [])

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#12121f] p-8 text-center shadow-2xl">
          <ShieldAlert className="mx-auto mb-4 text-red-300" size={42} />
          <h1 className="text-2xl font-black">Verification link unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">{error} Request a new verification email or contact support if the problem continues.</p>
          <Link href="/auth/login" className="btn-gold mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">Return to sign in</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#c9a84c]/20 bg-[#12121f] p-8 text-center shadow-2xl">
        <MailCheck className="mx-auto mb-4 text-[#c9a84c]" size={42} />
        <h1 className="text-2xl font-black">Verifying your email</h1>
        <p className="mt-3 text-sm text-gray-400">Please wait while we securely activate your AurexConnect account.</p>
        <Loader2 className="mx-auto mt-6 animate-spin text-[#c9a84c]" size={22} />
      </div>
    </main>
  )
}
