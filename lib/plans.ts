export const INVESTMENT_PLANS = [
  {
    name: 'Gold Plan',
    roiPercent: 8,
    minAmount: 50,
    maxAmount: 999,
    durationDays: 1,
    durationLabel: '24 Hours',
    referralBonus: 5,
    color: '#c9a84c',
    popular: true,
    description: 'A short-term entry plan with ROI credited within 24 hours.',
    features: ['8% total ROI', '$50 – $999 Investment', '24 Hour Duration', '5% Referral Bonus', '24/7 Support'],
  },
  {
    name: 'Silver Plan',
    roiPercent: 30,
    minAmount: 1000,
    maxAmount: 4999,
    durationDays: 1,
    durationLabel: '24 Hours',
    referralBonus: 5,
    color: '#cbd5e1',
    popular: false,
    description: 'A higher-capital plan with ROI credited within 24 hours.',
    features: ['30% total ROI', '$1,000 – $4,999 Investment', '24 Hour Duration', '5% Referral Bonus', 'Priority Support'],
  },
  {
    name: 'Bronze Plan',
    roiPercent: 60,
    minAmount: 10000,
    maxAmount: 49999,
    durationDays: 3,
    durationLabel: '3 Days',
    referralBonus: 5,
    color: '#d7875f',
    popular: false,
    description: 'A three-day plan for committed investors seeking a larger allocation.',
    features: ['60% total ROI', '$10,000 – $49,999 Investment', '3 Day Duration', '5% Referral Bonus', 'Dedicated Support'],
  },
  {
    name: 'Diamond Plan',
    roiPercent: 120,
    minAmount: 100000,
    maxAmount: null,
    durationDays: 30,
    durationLabel: '1 Month',
    referralBonus: 5,
    color: '#7dd3fc',
    popular: false,
    description: 'The highest-capital plan with a one-month investment duration.',
    features: ['120% total ROI', '$100,000+ Investment', '1 Month Duration', '5% Referral Bonus', 'VIP Account Support'],
  },
] as const

export function formatUsd(value: number | null) {
  return value === null ? '$Unlimited' : `$${value.toLocaleString('en-US')}`
}

export function durationLabel(days: number) {
  if (days === 1) return '24 Hours'
  if (days === 30) return '1 Month'
  return `${days} Days`
}
