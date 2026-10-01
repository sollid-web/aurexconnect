import Image from 'next/image'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { CheckCircle, ArrowRight, Shield, Clock, Zap } from 'lucide-react'
import { INVESTMENT_PLANS, durationLabel } from '@/lib/plans'

const PLANS = INVESTMENT_PLANS.map(plan => ({
  name: plan.name, roi: `${plan.roiPercent}%`, min: plan.minAmount, max: plan.maxAmount,
  duration: durationLabel(plan.durationDays), referral: `${plan.referralBonus}%`, color: plan.color,
  glow: `${plan.color}20`, popular: plan.popular, features: plan.features, desc: plan.description,
}))
const HOW_IT_WORKS = [
  { step: '01', title: 'Create an Account', desc: 'Register in under 2 minutes. Verify your identity with our KYC process to unlock full access.', icon: Zap },
  { step: '02', title: 'Deposit Funds',      desc: 'Fund your account with Bitcoin, Ethereum, or USDT. Deposits are credited within 30 minutes.', icon: Shield },
  { step: '03', title: 'Choose a Plan',      desc: 'Select the investment plan that matches your capital and return goals. Activate instantly.', icon: ArrowRight },
  { step: '04', title: 'Earn & Withdraw',    desc: 'ROI is credited according to the selected plan schedule, while principal is returned when the plan matures. Withdraw eligible funds anytime.', icon: CheckCircle },
]

export default function InvestmentPlansPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <PublicHeader />

      {/* Page hero */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80&auto=format&fit=crop"
            alt="Investment plans" fill className="object-cover opacity-15" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a14]/70 via-[#0a0a14]/80 to-[#0a0a14]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Earn With Us</div>
          <h1 className="text-5xl md:text-6xl font-black mb-6">Investment <span className="gold-text">Plans</span></h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Four client-defined tiers with clearly stated ROI, duration, referral bonus, and investment limits. Start with $50 and scale as you grow.
          </p>
        </div>
      </section>

      {/* Plans grid */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className="card-dark flex flex-col relative overflow-hidden transition-all hover:-translate-y-1"
              style={plan.popular ? { borderColor: `${plan.color}50`, boxShadow: `0 0 40px ${plan.glow}` } : {}}>
              {plan.popular && <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: plan.color }} />}
              {plan.popular && (
                <div className="absolute top-4 right-4 text-xs font-black px-2.5 py-1 rounded-full text-[#0a0a14]" style={{ background: plan.color }}>
                  POPULAR
                </div>
              )}
              <div className="p-6 pb-4">
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: plan.color }}>{plan.name}</div>
                <div className="text-6xl font-black leading-none" style={{ color: plan.color }}>{plan.roi}</div>
                <div className="text-gray-500 text-xs mt-1.5">Total ROI over {plan.duration}</div>
                <p className="text-gray-500 text-xs mt-3 leading-relaxed">{plan.desc}</p>
              </div>

              <div className="px-6 pb-4 border-t border-[#1e1e35] pt-4 flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                      <CheckCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-4">
                <Link href="/auth/register"
                  className="w-full block text-center py-3 rounded-xl font-bold text-sm transition-all"
                  style={plan.popular
                    ? { background: `linear-gradient(135deg, ${plan.color}, #e8cc7a)`, color: '#0a0a14' }
                    : { border: `1px solid ${plan.color}30`, color: plan.color }
                  }>
                  Start with {plan.name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[#12121f] border-y border-[#1e1e35]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Simple Process</div>
            <h2 className="text-4xl font-black">How It <span className="gold-text">Works</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="card-dark p-6 hover:border-[#c9a84c]/30 transition-all relative overflow-hidden">
                <div className="absolute top-4 right-4 text-6xl font-black text-white/3 select-none">{step}</div>
                <div className="w-12 h-12 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-[#c9a84c]" />
                </div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator teaser */}
      <section className="py-20 max-w-3xl mx-auto px-6 text-center">
        <div className="card-dark p-10 border-[#c9a84c]/20">
          <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Quick Example</div>
          <h2 className="text-3xl font-black mb-6">What Could You Earn?</h2>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { plan: 'Gold Plan', invest: '$500', profit: '+$40', total: '$540', period: '24h' },
              { plan: 'Silver Plan', invest: '$2,000', profit: '+$600', total: '$2,600', period: '24h' },
              { plan: 'Bronze Plan', invest: '$30,000', profit: '+$18,000', total: '$48,000', period: '3 days' },
            ].map(e => (
              <div key={e.plan} className="bg-[#0a0a14] border border-[#1e1e35] rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-2">{e.plan}</div>
                <div className="text-sm font-semibold mb-1">{e.invest}</div>
                <div className="text-green-400 text-sm font-bold">{e.profit}</div>
                <div className="text-xs text-gray-500 mt-1">in {e.period}</div>
              </div>
            ))}
          </div>
          <Link href="/auth/register" className="btn-gold px-8 py-3 rounded-xl inline-flex items-center gap-2">
            Get Started Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
