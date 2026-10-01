'use client'
import AnimatedHero from './components/AnimatedHero'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { INVESTMENT_PLANS, durationLabel, formatUsd } from '@/lib/plans'
import {
  Shield, TrendingUp, Clock, Users, ChevronRight,
  Bitcoin, DollarSign, BarChart3, Globe, Star,
  CheckCircle, ArrowRight, Zap, Lock, HeadphonesIcon,
  ChevronDown
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────

const HERO_SLIDES = [ 
  {
    title: 'We Serve You',
    accent: 'Better',
    sub: 'Certified traders working around the clock to grow your wealth with precision.',
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80&auto=format&fit=crop',
  },
  {
    title: 'Invest With a Firm You Can',
    accent: 'Trust',
    sub: '24/7 real-time monitoring of every investment position. Your capital, always watched.',
    img: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1600&q=80&auto=format&fit=crop',
  },
  {
    title: 'More Convenient',
    accent: 'Than Others',
    sub: 'Let your money do the hard work. Start with as little as $50 and build toward your goals.',
    img: 'https://images.unsplash.com/photo-1642790551116-18e4f468b72c?w=1600&q=80&auto=format&fit=crop',
  },
]

const STATS = [
  { label: 'Active Investors', value: '14,000+', icon: Users },
  { label: 'Total Paid Out',   value: '$48M+',   icon: DollarSign },
  { label: 'Countries Served', value: '120+',    icon: Globe },
  { label: 'Uptime',           value: '99.9%',   icon: Clock },
]

const SERVICES = [
  {
    title: 'Cryptocurrencies',
    icon: Bitcoin,
    desc: 'Trade and invest in top digital assets with fully automated portfolio management and real-time market execution.',
    img: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80&auto=format&fit=crop',
  },
  {
    title: 'Forex Trading',
    icon: BarChart3,
    desc: 'Access global currency markets with expert algorithmic strategies and institutional-grade liquidity.',
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80&auto=format&fit=crop',
  },
  {
    title: 'Hedge Funds',
    icon: TrendingUp,
    desc: 'Diversified hedge fund exposure managed by seasoned professionals across liquid asset classes.',
    img: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&q=80&auto=format&fit=crop',
  },
  {
    title: 'Escrow Services',
    icon: Shield,
    desc: 'Secure transaction escrow ensuring your capital is protected throughout every deal.',
    img: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&auto=format&fit=crop',
  },
  {
    title: 'Loans',
    icon: DollarSign,
    desc: 'Flexible lending solutions backed by your investment portfolio. Capital when you need it.',
    img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&q=80&auto=format&fit=crop',
  },
  {
    title: 'NFP Trading',
    icon: BarChart3,
    desc: 'Capitalise on Non-Farm Payroll announcements — one of the most predictable forex market events.',
    img: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&q=80&auto=format&fit=crop',
  },
]

const PLANS = INVESTMENT_PLANS.map(plan => ({
  name: plan.name.replace(' Plan', ''), roi: `${plan.roiPercent}%`, min: formatUsd(plan.minAmount), max: formatUsd(plan.maxAmount),
  duration: durationLabel(plan.durationDays), referral: `${plan.referralBonus}%`, color: plan.color, popular: plan.popular,
}))
const TESTIMONIALS = [
  {
    name: 'Michael R.', country: 'United States', rating: 5,
    text: 'AurexConnect turned my $2,000 into $2,500 in just one day. The platform is transparent and withdrawals are instant.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format&fit=crop&facepad=2',
  },
  {
    name: 'Amira K.', country: 'UAE', rating: 5,
    text: 'The Gold Plan made it easy to understand my first investment and follow my account activity from the dashboard.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop&facepad=2',
  },
  {
    name: 'James T.', country: 'United Kingdom', rating: 5,
    text: 'Transparent, reliable, and the support team is genuinely available 24/7. I recommend AurexConnect to everyone I know.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80&auto=format&fit=crop&facepad=2',
  },
]

const FAQS = [
  { q: 'How long does it take for my deposit to be credited?', a: 'Deposits are reviewed and credited within 5–30 minutes of confirmation on the blockchain.' },
  { q: 'How long does the withdrawal process take?', a: 'Withdrawals are processed within 1 hour. Occasionally delays occur due to network congestion, but we always prioritise fast disbursement.' },
  { q: 'Is my investment capital insured?', a: 'Yes. All invested funds are capital-insured. Should trading go against expectations, your principal is covered by our insurance policy up to $1,000,000.' },
  { q: 'Do you charge fees for your services?', a: 'No fees are charged to investors. We retain our operating profit before crediting your predetermined return rate.' },
  { q: 'What is the minimum investment?', a: 'You can start with $50 on the Gold Plan. The Diamond Plan starts at $100,000 and has no maximum investment limit.' },
  { q: 'Can I have multiple active investments?', a: 'Yes. You can run multiple plans simultaneously across different tiers.' },
]

const WHY_US = [
  { icon: Lock,            label: 'Highly Secured',      desc: 'Military-grade encryption and multi-factor authentication protect every account.' },
  { icon: TrendingUp,      label: 'High ROI',             desc: 'Industry-leading returns powered by algorithmic trading and expert fund managers.' },
  { icon: CheckCircle,     label: 'Guaranteed Returns',   desc: 'Capital insurance covers your principal on every plan. Invest with confidence.' },
  { icon: HeadphonesIcon,  label: '24/7 Live Support',    desc: 'Our support team is available around the clock via live chat and email.' },
]

// ── Component ─────────────────────────────────────────────────────────

export default function HomePage() {
  const [heroIdx, setHeroIdx]     = useState(0)
  const [openFaq, setOpenFaq]     = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const slide = HERO_SLIDES[heroIdx]

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <PublicHeader />
    
      
      <AnimatedHero />

      {/* ── STATS BAR ───────────────────────────────────────────── */}
      <section className="py-12 bg-[#12121f] border-y border-[#1e1e35]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center mx-auto mb-3">
                <Icon size={22} className="text-[#c9a84c]" />
              </div>
              <div className="text-3xl font-black gold-text mb-1">{value}</div>
              <div className="text-gray-500 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────── */}
      <section id="about-us" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">About AurexConnect</div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              A Global Asset Management <span className="gold-text">Leader</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              AurexConnect is a United States-based Asset and Stock Management Company with affiliates across Europe, Asia, and the Middle East. Established in 2016, we began trading stocks, shares, and bonds before expanding into Forex in 2018 and Cryptocurrency in 2019.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              Our 130+ team of professionals employs research-driven quantitative strategies across a wide range of liquid asset classes. We partner with the highest-quality fund managers and deliver a consistently exceptional rate of return.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {WHY_US.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 bg-[#12121f] border border-[#1e1e35] rounded-xl p-4 hover:border-[#c9a84c]/30 transition-all">
                  <div className="w-9 h-9 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-[#c9a84c]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5">{label}</div>
                    <div className="text-gray-500 text-xs leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/about" className="btn-gold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-sm">
              Read More About Us <ArrowRight size={16} />
            </Link>
          </div>

          {/* CEO photo */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/5]">
              <Image
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80&auto=format&fit=crop&facepad=3"
                alt="Bryce J. McFarlane — CEO"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-xl font-bold">Bryce J. McFarlane</h3>
                <p className="text-[#c9a84c] text-sm font-medium">Chief Executive Officer</p>
                <p className="text-gray-400 text-xs mt-1">20+ years in global asset management</p>
              </div>
            </div>
            {/* Floating stat */}
            <div className="absolute -top-4 -right-4 bg-[#12121f] border border-[#c9a84c]/30 rounded-2xl p-4 shadow-xl">
              <div className="text-2xl font-black gold-text">$48M+</div>
              <div className="text-xs text-gray-400">Paid to investors</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-[#12121f] border border-[#1e1e35] rounded-2xl p-4 shadow-xl">
              <div className="text-2xl font-black text-green-400">99.9%</div>
              <div className="text-xs text-gray-400">Uptime guaranteed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────────── */}
      <section id="services" className="py-24 bg-[#12121f] border-y border-[#1e1e35]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">What We Offer</div>
            <h2 className="text-4xl md:text-5xl font-black">Our <span className="gold-text">Services</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(({ title, icon: Icon, desc, img }) => (
              <div key={title} className="group card-dark overflow-hidden hover:border-[#c9a84c]/40 transition-all hover:-translate-y-1">
                {/* Service image */}
                <div className="relative h-44 overflow-hidden">
                  <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="400px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12121f] via-[#12121f]/40 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/20 backdrop-blur border border-[#c9a84c]/30 flex items-center justify-center">
                      <Icon size={18} className="text-[#c9a84c]" />
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INVESTMENT PLANS ────────────────────────────────────── */}
      <section id="investment-plans" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Earn With Us</div>
          <h2 className="text-4xl md:text-5xl font-black">Investment <span className="gold-text">Plans</span></h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">Choose a plan that fits your goals. All plans include guaranteed returns and 24/7 portfolio monitoring.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, i) => (
            <div key={plan.name} className={`card-dark p-6 flex flex-col relative overflow-hidden transition-all hover:-translate-y-1 ${plan.popular ? 'shadow-[0_0_40px_rgba(201,168,76,0.12)]' : ''}`}
              style={plan.popular ? { borderColor: `${plan.color}50` } : {}}>
              {plan.popular && <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: plan.color }} />}
              {plan.popular && (
                <div className="absolute top-4 right-4 text-xs font-black px-2 py-0.5 rounded-full text-[#0a0a14]" style={{ background: plan.color }}>
                  POPULAR
                </div>
              )}
              <div className="mb-6 pt-1">
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: plan.color }}>{plan.name} Plan</div>
                <div className="text-5xl font-black" style={{ color: plan.color }}>{plan.roi}</div>
                <div className="text-gray-500 text-xs mt-1">Return on Investment</div>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  ['Min Investment', plan.min],
                  ['Max Investment', plan.max],
                  ['Duration',       plan.duration],
                  ['Referral Bonus', plan.referral],
                ].map(([label, val]) => (
                  <li key={label} className="flex justify-between text-sm border-b border-[#1e1e35] pb-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold">{val}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${plan.popular ? 'btn-gold' : 'border border-[#1e1e35] hover:border-[#c9a84c] text-gray-300 hover:text-white'}`}>
                Invest Now
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/investment-plans" className="text-[#c9a84c] hover:underline text-sm flex items-center gap-1 justify-center">
            View full plan details <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section className="py-24 bg-[#12121f] border-y border-[#1e1e35]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Client Reviews</div>
            <h2 className="text-4xl font-black">What Investors <span className="gold-text">Say</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, country, text, rating, avatar }) => (
              <div key={name} className="card-dark p-6 hover:border-[#c9a84c]/30 transition-all">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-[#c9a84c] fill-[#c9a84c]" />
                  ))}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={avatar} alt={name} fill className="object-cover" sizes="40px" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{name}</div>
                    <div className="text-gray-500 text-xs">{country}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Got Questions?</div>
          <h2 className="text-4xl font-black">Frequently <span className="gold-text">Asked</span></h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className={`card-dark overflow-hidden transition-all ${openFaq === i ? 'border-[#c9a84c]/30' : ''}`}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-semibold text-sm pr-4">{faq.q}</span>
                <ChevronDown size={18} className={`text-[#c9a84c] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-[#1e1e35] pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80&auto=format&fit=crop"
            alt="CTA background"
            fill
            className="object-cover opacity-20"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a14] via-[#0a0a14]/90 to-[#0a0a14]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-6">
            <Zap size={28} className="text-[#0a0a14]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Ready to <span className="gold-text">Start Earning?</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join 14,000+ investors already growing their wealth with AurexConnect. Register in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="btn-gold px-8 py-4 rounded-xl text-base flex items-center gap-2 justify-center">
              Create Free Account <ChevronRight size={18} />
            </Link>
            <Link href="/investment-plans" className="px-8 py-4 rounded-xl border border-white/20 text-gray-300 hover:border-[#c9a84c] hover:text-white transition-all flex items-center gap-2 justify-center">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
