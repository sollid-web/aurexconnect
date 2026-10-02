'use client'
import Image from "next/image";
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, TrendingUp } from 'lucide-react'

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
      {/* ── Crypto ticker strip ── */}
      <div className="w-full bg-[#0d0d1a] border-b border-[#1e1e35] overflow-hidden py-2 hidden md:block">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap px-6 text-xs text-gray-400">
          {[
            { sym: 'BTC', price: '$67,420', change: '+2.4%', up: true },
            { sym: 'ETH', price: '$3,512',  change: '+1.8%', up: true },
            { sym: 'SOL', price: '$178.4',  change: '-0.6%', up: false },
            { sym: 'BNB', price: '$608.2',  change: '+1.1%', up: true },
            { sym: 'XRP', price: '$0.612',  change: '+3.2%', up: true },
            { sym: 'ADA', price: '$0.481',  change: '-1.0%', up: false },
            { sym: 'LTC', price: '$84.30',  change: '+0.9%', up: true },
            { sym: 'DOT', price: '$9.142',  change: '+2.1%', up: true },
            { sym: 'AVAX',price: '$38.72',  change: '-0.4%', up: false },
            { sym: 'MATIC',price:'$0.891',  change: '+1.5%', up: true },
          ].concat([ // repeat for seamless scroll
            { sym: 'BTC', price: '$67,420', change: '+2.4%', up: true },
            { sym: 'ETH', price: '$3,512',  change: '+1.8%', up: true },
            { sym: 'SOL', price: '$178.4',  change: '-0.6%', up: false },
            { sym: 'BNB', price: '$608.2',  change: '+1.1%', up: true },
          ]).map((coin, i) => (
            <span key={i} className="inline-flex items-center gap-2 mr-8">
              <span className="font-bold text-gray-200">{coin.sym}</span>
              <span>{coin.price}</span>
              <span className={coin.up ? 'text-green-400' : 'text-red-400'}>{coin.change}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Top contact bar ── */}
      <div className="hidden md:block bg-[#12121f] border-b border-[#1e1e35] text-xs text-gray-500 py-2 px-6">
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
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || pathname !== '/'
          ? 'bg-[#0a0a14]/98 backdrop-blur border-b border-[#1e1e35] shadow-xl'
          : 'bg-[#0a0a14]/80 backdrop-blur'
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
          <div className="lg:hidden bg-[#12121f] border-t border-[#1e1e35] px-6 py-4 space-y-1">
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
