'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { CheckCircle2, ChevronRight, KeyRound, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react'

interface Profile {
  id: string
  email: string
  fullName: string
  phone: string | null
  country: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
  emailVerified?: string | null
  kycStatus?: string
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/user/me')
      .then(response => response.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProfile(data)
        setFullName(data.fullName || '')
        setPhone(data.phone || '')
        setCountry(data.country || '')
      })
      .catch(() => toast.error('Could not load your profile'))
      .finally(() => setLoading(false))
  }, [])

  const username = useMemo(() => {
    const email = profile?.email || session?.user?.email || ''
    return email ? `@${email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '')}` : '@investor'
  }, [profile?.email, session?.user?.email])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone: phone || null, country: country || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update profile')
      setProfile(current => current ? { ...current, ...data.user } : current)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex min-h-[420px] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c9a84c] border-t-transparent" /></div>

  const joined = profile?.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt)) : 'Recently'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#c9a84c]/20 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.25),transparent_42%),linear-gradient(135deg,#17172a,#0e0e1d)] p-6 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#c9a84c]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8cc7a] to-[#a47c22] text-2xl font-black text-[#0a0a14] shadow-lg shadow-[#c9a84c]/20">
              {(profile?.fullName || session?.user?.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#e8cc7a]">Investor profile</p>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{profile?.fullName || 'Your profile'}</h1>
              <p className="mt-1 text-sm text-gray-400">{username} · Member since {joined}</p>
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />Account active</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={saveProfile} className="card-dark p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-bold">Personal information</h2><p className="mt-1 text-sm text-gray-500">Keep your account details current for a smoother experience.</p></div>
            <UserRound size={20} className="text-[#c9a84c]" />
          </div>
          <div className="space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Full name</span><input value={fullName} onChange={event => setFullName(event.target.value)} className="w-full rounded-xl border border-[#2b2b45] bg-[#0a0a14] px-4 py-3 text-sm text-white outline-none transition focus:border-[#c9a84c]" required /></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Username</span><div className="flex items-center gap-3 rounded-xl border border-[#1e1e35] bg-[#0a0a14] px-4 py-3 text-sm text-gray-400"><span className="text-[#c9a84c]">@</span>{username.slice(1)}<span className="ml-auto text-[11px] text-gray-600">From email</span></div></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email address</span><div className="flex items-center gap-3 rounded-xl border border-[#1e1e35] bg-[#0a0a14] px-4 py-3 text-sm text-gray-400"><Mail size={16} className="text-gray-600" />{profile?.email}<span className="ml-auto text-[11px] text-emerald-400">Verified</span></div></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</span><div className="flex items-center rounded-xl border border-[#2b2b45] bg-[#0a0a14] px-3 focus-within:border-[#c9a84c]"><Phone size={16} className="text-gray-600" /><input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Optional" className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none" /></div></label>
              <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Country</span><div className="flex items-center rounded-xl border border-[#2b2b45] bg-[#0a0a14] px-3 focus-within:border-[#c9a84c]"><MapPin size={16} className="text-gray-600" /><input value={country} onChange={event => setCountry(event.target.value)} placeholder="Optional" className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none" /></div></label>
            </div>
          </div>
          <div className="mt-7 flex justify-end"><button type="submit" disabled={saving} className="btn-gold rounded-xl px-5 py-3 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>

        <div className="space-y-6">
          <div className="card-dark p-6 sm:p-7">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-bold">Security</h2><p className="mt-1 text-sm text-gray-500">Protect access to your investment account.</p></div><ShieldCheck size={20} className="text-emerald-400" /></div>
            <div className="space-y-3">
              <Link href="/auth/forgot-password" className="flex items-center gap-3 rounded-xl border border-[#1e1e35] bg-[#0a0a14] p-3 transition hover:border-[#c9a84c]/40"><KeyRound size={17} className="text-[#c9a84c]" /><span className="flex-1"><span className="block text-sm font-semibold">Change password</span><span className="block text-xs text-gray-500">Use a secure password you do not reuse</span></span><ChevronRight size={16} className="text-gray-600" /></Link>
              <div className="flex items-center gap-3 rounded-xl border border-[#1e1e35] bg-[#0a0a14] p-3"><LockKeyhole size={17} className="text-blue-300" /><span className="flex-1"><span className="block text-sm font-semibold">Two-factor authentication</span><span className="block text-xs text-gray-500">Optional extra protection for sign-in</span></span><span className="rounded-full bg-gray-500/10 px-2 py-1 text-[10px] font-bold text-gray-500">Not enabled</span></div>
            </div>
          </div>
          <div className="card-dark p-6 sm:p-7"><h2 className="mb-4 text-lg font-bold">Verification status</h2><div className="space-y-3"><div className="flex items-center justify-between text-sm"><span className="text-gray-400">Email verification</span><span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={15} /> Complete</span></div><div className="flex items-center justify-between text-sm"><span className="text-gray-400">Identity verification</span><Link href="/dashboard/kyc" className="text-[#c9a84c] hover:underline">{profile?.kycStatus === 'APPROVED' ? 'Approved' : 'Review KYC'}</Link></div></div></div>
        </div>
      </div>
    </div>
  )
}
