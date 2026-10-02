import Image from 'next/image'
import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { Linkedin, Twitter, ArrowRight } from 'lucide-react'

const TEAM = [
  {
    name: 'Bryce J. McFarlane',
    role: 'Chief Executive Officer & Founder',
    bio: '20+ years in global asset management. Former Goldman Sachs VP. Expert in quantitative trading strategy and hedge fund operations.',
    img: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
  {
    name: 'Sophia Anderson',
    role: 'Chief Investment Officer',
    bio: 'Oxford-educated economist with 15 years of systematic investment strategy design. Former Head of Algo Trading at Deutsche Bank.',
    img: 'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
  {
    name: 'Daniel Owen',
    role: 'Chief Technology Officer',
    bio: 'Full-stack engineer and blockchain architect. Built trading infrastructure handling $2B+ daily volume. Former Coinbase senior engineer.',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
  {
    name: 'Rachel Thornton',
    role: 'Head of Forex & NFP Trading',
    bio: '12 years specialising in G10 currency pairs and macroeconomic event trading. Published author on Non-Farm Payroll strategies.',
    img: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
  {
    name: 'Marcus Chen',
    role: 'Head of Cryptocurrency Division',
    bio: 'Early Bitcoin adopter turned institutional crypto strategist. Former Binance institutional desk lead. CFA Charterholder.',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
  {
    name: 'Fatima Al-Rashid',
    role: 'Head of Client Relations',
    bio: 'Multilingual investor relations specialist with 10 years managing HNW portfolios across Middle East and European markets.',
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
  {
    name: 'James Ellis',
    role: 'Head of Compliance & Risk',
    bio: 'Former SEC examiner with deep expertise in financial regulation, AML compliance, and institutional risk frameworks.',
    img: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=400&q=80&auto=format&fit=crop&facepad=2',
  },
  {
    name: 'Elena Vasquez',
    role: 'Senior Quantitative Analyst',
    bio: 'PhD in Mathematical Finance from MIT. Specialises in derivatives pricing models and high-frequency trading algorithms.',
    img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop&facepad=3',
  },
]

const DEPARTMENTS = [
  { name: 'Trading & Investments', count: 42, icon: '📈' },
  { name: 'Technology & Engineering', count: 28, icon: '💻' },
  { name: 'Client Relations',  count: 22, icon: '🤝' },
  { name: 'Compliance & Risk', count: 18, icon: '🛡️' },
  { name: 'Operations',        count: 14, icon: '⚙️' },
  { name: 'Research & Analytics', count: 10, icon: '🔬' },
]

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <PublicHeader />

      {/* Page hero */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80&auto=format&fit=crop"
            alt="Team" fill className="object-cover opacity-20" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a14]/60 via-[#0a0a14]/80 to-[#0a0a14]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">The People Behind the Returns</div>
          <h1 className="text-5xl md:text-6xl font-black mb-6">Our <span className="gold-text">Team</span></h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            130+ professionals united by a shared mission — to deliver exceptional investment returns with full transparency.
          </p>
        </div>
      </section>

      {/* Department stats */}
      <section className="py-16 bg-[#12121f] border-y border-[#1e1e35]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {DEPARTMENTS.map(d => (
              <div key={d.name} className="card-dark p-4 text-center hover:border-[#c9a84c]/30 transition-all">
                <div className="text-2xl mb-2">{d.icon}</div>
                <div className="font-black text-xl gold-text">{d.count}</div>
                <div className="text-gray-500 text-xs mt-1 leading-snug">{d.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team grid */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Leadership</div>
          <h2 className="text-4xl font-black">Meet the <span className="gold-text">Experts</span></h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM.map(member => (
            <div key={member.name} className="group card-dark overflow-hidden hover:border-[#c9a84c]/40 transition-all hover:-translate-y-1">
              {/* Photo */}
              <div className="relative h-64 overflow-hidden">
                <Image src={member.img} alt={member.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="300px" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121f] via-transparent to-transparent" />
                {/* Social links on hover */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-7 h-7 rounded-lg bg-[#0a0a14]/80 flex items-center justify-center cursor-pointer hover:bg-[#c9a84c]/20">
                    <Linkedin size={13} className="text-[#c9a84c]" />
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#0a0a14]/80 flex items-center justify-center cursor-pointer hover:bg-[#c9a84c]/20">
                    <Twitter size={13} className="text-[#c9a84c]" />
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="p-5">
                <h3 className="font-bold text-base mb-0.5">{member.name}</h3>
                <div className="text-[#c9a84c] text-xs font-semibold mb-3">{member.role}</div>
                <p className="text-gray-500 text-xs leading-relaxed">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Join the team */}
      <section className="py-20 bg-[#12121f] border-y border-[#1e1e35]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black mb-4">Want to <span className="gold-text">Join Us?</span></h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            We're always looking for exceptional traders, engineers, and financial analysts to join our growing team. Send your CV to careers@aurexconnect.site
          </p>
          <a href="mailto:careers@aurexconnect.site"
            className="btn-gold px-8 py-3.5 rounded-xl inline-flex items-center gap-2">
            Apply Now <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
