import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import Link from 'next/link'

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By registering an account and using the AurexConnect platform, you confirm that you have read, understood, and agreed to these Terms and Conditions in full. If you do not agree to these terms, you must not use our platform. AurexConnect reserves the right to update these policies at any time, and continued use of the platform constitutes acceptance of any revisions.`,
  },
  {
    title: '2. Eligibility',
    content: `You must be at least 18 years of age to create an account and invest on this platform. By registering, you represent and warrant that you are legally permitted to participate in investment activities in your jurisdiction. Users from jurisdictions where such activities are prohibited are not permitted to use this platform.`,
  },
  {
    title: '3. Investment Plans & Returns',
    content: `AurexConnect offers four investment plans: Gold (8% ROI/$50–$999/24 hours), Silver (30% ROI/$1,000–$4,999/24 hours), Bronze (60% ROI/$10,000–$49,999/3 days), and Diamond (120% ROI/$100,000+/1 month with no maximum). ROI is credited according to the plan schedule, with longer-duration plans credited in daily installments until maturity. Every plan carries a 5% referral bonus. Past performance does not guarantee future results. Investment activities carry inherent risk.`,
  },
  {
    title: '4. Deposits',
    content: `Deposits are accepted via Bitcoin (BTC), Ethereum (ETH), and Tether (USDT/TRC20). All deposits must include a valid transaction hash for verification. Deposits are subject to administrative review and are typically credited within 30 minutes of blockchain confirmation. AurexConnect reserves the right to reject deposits that cannot be verified or that originate from sanctioned addresses.`,
  },
  {
    title: '5. Withdrawals',
    content: `Withdrawal requests are processed within 24 hours of submission. The minimum withdrawal amount is $10 USD. Users are responsible for providing accurate wallet addresses. AurexConnect accepts no liability for funds sent to incorrect addresses provided by the user. Withdrawals may be subject to compliance checks and may be delayed where suspicious activity is detected.`,
  },
  {
    title: '6. KYC & Identity Verification',
    content: `To comply with global AML and KYC regulations, all users are required to complete identity verification before accessing full platform features. This includes submission of a government-issued photo ID and a selfie. Documents are reviewed by our compliance team within 24-48 hours. AurexConnect reserves the right to suspend accounts where KYC requirements are not met.`,
  },
  {
    title: '7. Referral Program',
    content: `The referral program rewards users for introducing new investors. The referral bonus is 5% for each plan and is credited according to the platform's completed-investment rules. Referral fraud, including self-referral or fabricated accounts, will result in immediate account termination and forfeiture of all bonuses.`,
  },
  {
    title: '8. Capital Insurance Policy',
    content: `AurexConnect maintains an insurance policy covering investor principal against trading losses. In the event trading performance causes a deficit, insured principal is protected up to the value of each individual investment. AurexConnect also maintains an Employee Negligence cover of up to $1,000,000. Insurance does not cover losses resulting from user error (e.g. incorrect withdrawal addresses) or violations of these terms.`,
  },
  {
    title: '9. Account Security',
    content: `Users are solely responsible for maintaining the security of their login credentials. AurexConnect will never ask for your password via email or chat. You must immediately notify us at support@aurexconnect.com if you suspect unauthorised access to your account. AurexConnect cannot be held liable for losses resulting from compromised credentials caused by user negligence.`,
  },
  {
    title: '10. Prohibited Activities',
    content: `Users must not engage in money laundering, fraud, market manipulation, or any other unlawful activity through this platform. Multiple accounts per person are prohibited. Automated scripting, bots, or programmatic access to the platform without written consent is forbidden. Violation of any of these prohibitions will result in immediate account suspension and reporting to relevant authorities.`,
  },
  {
    title: '11. Privacy Policy',
    content: `AurexConnect collects personal data solely for the purpose of operating the platform, fulfilling regulatory requirements, and improving our services. We do not sell personal data to third parties. Data is stored securely using industry-standard encryption. You may request deletion of your account and associated data by contacting support@aurexconnect.com. Regulatory records may be retained for up to 7 years as required by law.`,
  },
  {
    title: '12. Limitation of Liability',
    content: `AurexConnect shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform, including but not limited to loss of profit, loss of data, or business interruption. Our total liability to any individual user shall not exceed the amount invested by that user in the 90 days preceding the event giving rise to the claim.`,
  },
  {
    title: '13. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the State of Pennsylvania, United States of America. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Pennsylvania.`,
  },
  {
    title: '14. Contact',
    content: `For questions, complaints, or legal notices regarding these policies, please contact: AurexConnect Compliance Team · 3536 Badger Pond Lane, Pittsburgh, PA 15212, United States · support@aurexconnect.com · +44 7876 263 213`,
  },
]

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <PublicHeader />

      {/* Header */}
      <section className="py-20 max-w-4xl mx-auto px-6 text-center">
        <div className="text-[#c9a84c] text-sm font-semibold uppercase tracking-widest mb-4">Legal</div>
        <h1 className="text-5xl font-black mb-4">Company <span className="gold-text">Policies</span></h1>
        <p className="text-gray-400">
          Last updated: January 2025 · Please read these terms carefully before using AurexConnect.
        </p>
      </section>

      {/* Policies content */}
      <section className="pb-24 max-w-4xl mx-auto px-6">
        <div className="space-y-6">
          {SECTIONS.map(({ title, content }) => (
            <div key={title} className="card-dark p-6 hover:border-[#c9a84c]/20 transition-all">
              <h2 className="font-bold text-lg mb-3 text-white">{title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{content}</p>
            </div>
          ))}
        </div>

        {/* Agreement CTA */}
        <div className="mt-12 card-dark p-8 text-center border-[#c9a84c]/20">
          <h3 className="text-2xl font-black mb-3">Ready to <span className="gold-text">Get Started?</span></h3>
          <p className="text-gray-400 text-sm mb-6">
            By creating an account, you confirm that you have read and accept these policies.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/register" className="btn-gold px-6 py-3 rounded-xl text-sm">
              Create Account
            </Link>
            <a href="mailto:support@aurexconnect.com"
              className="px-6 py-3 rounded-xl border border-[#1e1e35] text-gray-300 hover:border-[#c9a84c] text-sm transition-all">
              Contact Support
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
