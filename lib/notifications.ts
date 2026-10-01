import { prisma } from './prisma'

type NotifType = 'info' | 'success' | 'warning' | 'error'

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotifType = 'info',
  link?: string
) {
  return prisma.notification.create({
    data: { userId, title, message, type, link },
  })
}

// Preset notification templates
export const Notifs = {
  depositPending: (amount: number) => ({
    title: 'Deposit Received',
    message: `Your deposit of $${amount.toFixed(2)} has been received and is under review. You'll be notified once approved.`,
    type: 'info' as NotifType,
    link: '/dashboard/transactions',
  }),
  depositApproved: (amount: number) => ({
    title: '✅ Deposit Approved',
    message: `Your deposit of $${amount.toFixed(2)} has been approved and credited to your balance.`,
    type: 'success' as NotifType,
    link: '/dashboard',
  }),
  depositRejected: (amount: number, reason?: string) => ({
    title: '❌ Deposit Rejected',
    message: `Your deposit of $${amount.toFixed(2)} was rejected${reason ? `: ${reason}` : '. Please contact support.'}`,
    type: 'error' as NotifType,
    link: '/dashboard/transactions',
  }),
  withdrawalPending: (amount: number) => ({
    title: 'Withdrawal Requested',
    message: `Your withdrawal of $${amount.toFixed(2)} is being processed. You'll be notified once sent.`,
    type: 'info' as NotifType,
    link: '/dashboard/transactions',
  }),
  withdrawalApproved: (amount: number) => ({
    title: '✅ Withdrawal Sent',
    message: `Your withdrawal of $${amount.toFixed(2)} has been approved and sent to your wallet.`,
    type: 'success' as NotifType,
    link: '/dashboard/transactions',
  }),
  withdrawalRejected: (amount: number, reason?: string) => ({
    title: '❌ Withdrawal Rejected',
    message: `Your withdrawal of $${amount.toFixed(2)} was rejected${reason ? `: ${reason}` : '. Please contact support.'}`,
    type: 'error' as NotifType,
    link: '/dashboard/transactions',
  }),
  kycPending: () => ({
    title: 'KYC Submitted',
    message: 'Your identity documents have been submitted and are under review. This typically takes 24–48 hours.',
    type: 'info' as NotifType,
    link: '/dashboard/kyc',
  }),
  kycApproved: () => ({
    title: '✅ KYC Approved',
    message: 'Your identity has been verified. You now have full access to all platform features.',
    type: 'success' as NotifType,
    link: '/dashboard',
  }),
  kycRejected: (reason?: string) => ({
    title: '❌ KYC Rejected',
    message: `Your KYC verification was rejected${reason ? `: ${reason}` : '. Please resubmit with clearer documents.'}`,
    type: 'error' as NotifType,
    link: '/dashboard/kyc',
  }),
  profitCredited: (amount: number, planName: string) => ({
    title: '💰 Profit Credited',
    message: `Your ${planName} investment matured! $${amount.toFixed(2)} profit has been credited to your balance.`,
    type: 'success' as NotifType,
    link: '/dashboard',
  }),
  dailyRoi: (amount: number, planName: string, matured: boolean) => ({
    title: matured ? '✅ Investment Matured' : '💰 Daily ROI Credited',
    message: matured
      ? `Your ${planName} investment has matured. ${amount > 0 ? `$${amount.toFixed(2)} final ROI` : 'Final ROI'} and your principal have been credited to your balance.`
      : `$${amount.toFixed(2)} daily ROI from your ${planName} investment has been credited to your balance.`,
    type: 'success' as NotifType,
    link: '/dashboard',
  }),
  referralBonus: (amount: number) => ({
    title: '🎁 Referral Bonus',
    message: `You earned a $${amount.toFixed(2)} referral bonus! A friend you referred just made an investment.`,
    type: 'success' as NotifType,
    link: '/dashboard',
  }),
}
