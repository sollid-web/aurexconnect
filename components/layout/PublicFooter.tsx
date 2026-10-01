import Link from 'next/link'
import Image from "next/image";
const QUICK_LINKS = [
  { label: 'Home',             href: '/' },
  { label: 'Investment Plans', href: '/investment-plans' },
  { label: 'About Us',         href: '/about' },
  { label: 'Our Team',         href: '/our-team' },
  { label: 'Policies',         href: '/policies' },
  { label: 'Login',            href: '/auth/login' },
  { label: 'Register',         href: '/auth/register' },
]

const SERVICES = [
  'Cryptocurrency Trading',
  'Forex Trading',
  'Hedge Fund Management',
  'Escrow Services',
  'Loan Services',
  'NFP Trading',
]

const PAYMENT_METHODS = [
  { name: 'Bitcoin',  sym: 'BTC', color: '#f7931a' },
  { name: 'Ethereum', sym: 'ETH', color: '#627eea' },
  { name: 'Tether',   sym: 'USDT',color: '#26a17b' },
]

export default function PublicFooter() {
  return (
    <footer className="bg-[#0a0a14] border-t border-[#1e1e35]">

      {/* Payment methods strip */}
      <div className="bg-[#12121f] border-b border-[#1e1e35] py-6">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-5">
            Payment Methods We Accept
          </p>
          <div className="flex justify-center gap-6 flex-wrap">
            {PAYMENT_METHODS.map(({ name, sym, color }) => (
              <div key={sym}
                className="flex items-center gap-3 bg-[#0a0a14] border border-[#1e1e35] rounded-xl px-5 py-3 hover:border-[#c9a84c]/30 transition-all">
                {/* Coin icon */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white"
                  style={{ background: color }}>
                  {sym[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{sym}</div>
                  <div className="text-xs text-gray-500">{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-12 gap-10">

        {/* Brand col */}
        <div className="md:col-span-4">
          <Link href="/" className="flex items-center gap-2.5 mb-5">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="8" fill="url(#footer-gold)"/>
              <path d="M8 24 L14 14 L18 20 L22 12 L28 24" stroke="#0a0a14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="22" cy="12" r="2.5" fill="#0a0a14"/>
              <defs>
                <linearGradient id="footer-gold" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c9a84c"/><stop offset="1" stopColor="#e8cc7a"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-black">
              <span className="gold-text">Aurex</span><span className="text-white">Connect</span>
            </span>
          </Link>

          <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs">
            A United States-based Asset and Stock Management Company delivering exceptional returns for global investors since 2016.
          </p>

          {/* Contact info */}
          <div className="space-y-3 text-sm text-gray-500">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex-shrink-0">📍</span>
              <span>3536 Badger Pond Lane, Pittsburgh, PA 15212, United States</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span>✉️</span>
              <a href="mailto:support@aurexconnect.com" className="hover:text-[#c9a84c] transition-colors">
                support@aurexconnect.com
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <span>📞</span>
              <a href="tel:+447876263213" className="hover:text-[#c9a84c] transition-colors">
                +44 7876 263 213
              </a>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="md:col-span-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Quick Links</h4>
          <ul className="space-y-2.5">
            {QUICK_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link href={href}
                  className="text-sm text-gray-500 hover:text-[#c9a84c] transition-colors flex items-center gap-1.5">
                  <span className="text-[#c9a84c] opacity-60">›</span> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div className="md:col-span-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Services</h4>
          <ul className="space-y-2.5">
            {SERVICES.map(s => (
              <li key={s} className="text-sm text-gray-500 flex items-center gap-1.5">
                <span className="text-[#c9a84c] opacity-60">›</span> {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Company certificate */}
        <div className="md:col-span-2">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">Company Certificate</h4>
          <a href="/certificate.png" target="_blank" rel="noopener noreferrer"
            className="group block rounded-2xl border border-[#c9a84c]/40 bg-[#12121f] p-3 shadow-[0_0_24px_rgba(201,168,76,0.08)] transition-all hover:border-[#e8cc7a] hover:shadow-[0_0_30px_rgba(201,168,76,0.18)]">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white p-2">
              <Image
                src="/certificate.png"
                alt="AurexConnect company certificate"
                width={220}
                height={295}
                className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-1 pt-3">
              <div>
                <div className="text-sm font-bold text-white">AurexConnect Certificate</div>
                <div className="text-xs text-gray-400 mt-1">Open full-size document</div>
              </div>
              <span className="rounded-lg bg-[#c9a84c] px-2.5 py-1.5 text-[11px] font-black text-[#0a0a14]">VIEW</span>
            </div>
          </a>
        </div>
          {/* Live support badge */}
          <div className="mt-4 bg-green-400/10 border border-green-400/20 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">Live Support</span>
            </div>
            <div className="text-gray-500 text-xs">24 / 7 Available</div>
          </div>
        </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1e1e35] py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>© {new Date().getFullYear()} AurexConnect. All Rights Reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/policies" className="hover:text-[#c9a84c] transition-colors">Privacy Policy</Link>
            <Link href="/policies" className="hover:text-[#c9a84c] transition-colors">Terms of Service</Link>
            <Link href="/policies" className="hover:text-[#c9a84c] transition-colors">Company Policies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
