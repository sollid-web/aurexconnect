'use client'
import Image from "next/image";
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, TrendingUp } from 'lucide-react'
import CryptoTicker from '@/app/components/CryptoTicker'

const NAV_LINKS = [
  { label: 'Home',             href: '/' },
  { label: 'Investment Plans', href: '/investment-plans' },
  { label: 'About Us',         href: '/about' },
  { label: 'Our Team',         href: '/our-team' },
  { label: 'Policies',         href: '/policies' },
]

export default function PublicHeader() {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* ── Global crypto market ticker ── */}
      <CryptoTicker />

      {/* ── Top contact bar ── */}
      <div className="glass-panel hidden md:block !rounded-none !border-x-0 !border-t-0 text-xs text-gray-500 py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span>📍 3536 Badger Pond Lane, Pittsburgh, PA 15212, US</span>
            <span>✉️ support@aurexconnect.site</span>
          </div>
          <div className="flex items-center gap-4">
            <span>📞 +44 7876 263 213</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Markets Open
            </span>
          </div>
        </div>
      </div>

      {/* ── Main navigation ── */}
      <nav className={`glass-panel sticky top-0 z-50 !rounded-none !border-x-0 !border-t-0 transition-all duration-300 ${
        scrolled || pathname !== '/' ? 'shadow-xl' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

      

<Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
  <Image
    src="/logo.png"
    alt="AurexConnect Logo"
    width={36}
    height={36}
  />

  <span className="text-xl font-black tracking-tight">
    <span className="gold-text">Aurex</span>
    <span className="text-white">Connect</span>
  </span>
</Link>
          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(href)
                    ? 'text-[#c9a84c] bg-[#c9a84c]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                {label}
              </Link>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/auth/login"
              className="text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-[#1e1e35] hover:border-[#c9a84c]/50 transition-all">
              Login
            </Link>
            <Link href="/auth/register"
              className="btn-gold text-sm py-2 px-5 rounded-lg">
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="lg:hidden text-gray-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="glass-panel lg:hidden !rounded-none !border-x-0 !border-b-0 px-6 py-4 space-y-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(href)
                    ? 'text-[#c9a84c] bg-[#c9a84c]/10'
                    : 'text-gray-400 hover:text-white'
                }`}>
                {label}
              </Link>
            ))}
            <div className="flex gap-3 pt-3 border-t border-[#1e1e35] mt-3">
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2.5 border border-[#1e1e35] rounded-xl text-sm text-gray-300">
                Login
              </Link>
              <Link href="/auth/register" onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2.5 btn-gold rounded-xl text-sm">
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
