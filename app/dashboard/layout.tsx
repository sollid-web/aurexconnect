'use client'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle,
  ListOrdered, Receipt, User, LogOut, TrendingUp,
  Menu, X, ChevronRight, Shield, Bell, FileCheck
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/deposit', label: 'Deposit', icon: ArrowDownCircle },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpCircle },
  { href: '/dashboard/plans', label: 'Invest', icon: ListOrdered },
  { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  { href: '/dashboard/kyc', label: 'KYC Verification', icon: FileCheck },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') router.replace('/admin')
  }, [status, router])

  // Poll for unread notifications every 60 seconds
  useEffect(() => {
    if (status !== 'authenticated') return
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        setUnreadCount(data.unreadCount || 0)
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [status])

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role === 'ADMIN')) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
      </div>
    )
  }

  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-[#1e1e35]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
            <TrendingUp size={18} className="text-[#0a0a14]" />
          </div>
          <span className="text-lg font-bold"><span className="gold-text">Aurex</span>Connect</span>
        </Link>
      </div>

      <div className="p-4 mx-4 mt-4 bg-[#0a0a14] rounded-xl border border-[#1e1e35]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-[#0a0a14] font-black text-sm">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-semibold truncate">{session?.user?.name || 'Investor'}</div>
            <div className="text-xs text-gray-500 truncate">{session?.user?.email}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isNotif = href === '/dashboard/notifications'
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative
                ${isActive(href)
                  ? 'bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={18} />
              {label}
              {isNotif && unreadCount > 0 && (
                <span className="ml-auto bg-[#c9a84c] text-[#0a0a14] text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {!isNotif && isActive(href) && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}

        {session?.user?.role === 'ADMIN' && (
          <Link href="/admin" onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mt-3
              ${pathname.startsWith('/admin')
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <Shield size={18} />
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-[#1e1e35]">
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all w-full">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      <aside className="glass-panel hidden lg:flex w-64 !rounded-none !border-y-0 !border-l-0 flex-col fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="glass-panel relative w-72 !rounded-none !border-y-0 !border-l-0 flex flex-col z-10">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-64">
        <div className="glass-panel sticky top-0 z-30 !rounded-none !border-x-0 !border-t-0 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu size={22} />
          </button>
          <div className="text-sm text-gray-500 hidden lg:block">
            Welcome back, <span className="text-white font-medium">{session?.user?.name?.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <Link href="/dashboard/notifications" className="relative text-gray-400 hover:text-white">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c9a84c] text-[#0a0a14] text-xs font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] text-xs px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
              Live
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
