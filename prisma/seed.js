const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { addDays } = require('date-fns')

const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Cleaning database before seeding...");

  // 1. Delete child records first (records that depend on others)
  // This prevents Foreign Key Constraint errors
  await prisma.investment.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.kycSubmission.deleteMany({});

  // 2. Delete the parent records
  await prisma.plan.deleteMany({});
  await prisma.walletAddress.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✅ Database cleared.");
  console.log('🌱 Seeding AurexConnect database...\n')

  // ── Admin user ──────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aurexconnect.com' },
    update: {},
    create: {
      email: 'admin@aurexconnect.com',
      password: adminPassword,
      fullName: 'AurexConnect Admin',
      role: 'ADMIN',
      kycStatus: 'APPROVED',
      isActive: true,
      referralCode: 'ADMIN001',
    },
  })
  console.log('✅ Admin user:', admin.email)

  // ── Demo investor ───────────────────────────────────────
  const userPassword = await bcrypt.hash('User@123456', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@aurexconnect.com' },
    update: {},
    create: {
      email: 'demo@aurexconnect.com',
      password: userPassword,
      fullName: 'Demo Investor',
      role: 'USER',
      kycStatus: 'APPROVED',
      isActive: true,
      balance: 5000,
      totalDeposited: 5000,
      referralCode: 'DEMO001',
    },
  })
  console.log('✅ Demo user:', demoUser.email)

  // ── Investment plans ────────────────────────────────────
  const plansData = [
    { name: 'Gold Plan', roiPercent: 8, minAmount: 50, maxAmount: 999, durationDays: 1, referralBonus: 5, description: 'A short-term entry plan with ROI credited within 24 hours.', features: ['8% total ROI', '$50 – $999 Investment', '24 Hour Duration', '5% Referral Bonus', '24/7 Support'] },
    { name: 'Silver Plan', roiPercent: 30, minAmount: 1000, maxAmount: 4999, durationDays: 1, referralBonus: 5, description: 'A higher-capital plan with ROI credited within 24 hours.', features: ['30% total ROI', '$1,000 – $4,999 Investment', '24 Hour Duration', '5% Referral Bonus', 'Priority Support'] },
    { name: 'Bronze Plan', roiPercent: 60, minAmount: 10000, maxAmount: 49999, durationDays: 3, referralBonus: 5, description: 'A three-day plan for committed investors seeking a larger allocation.', features: ['60% total ROI', '$10,000 – $49,999 Investment', '3 Day Duration', '5% Referral Bonus', 'Dedicated Support'] },
    { name: 'Diamond Plan', roiPercent: 120, minAmount: 100000, maxAmount: null, durationDays: 30, referralBonus: 5, description: 'The highest-capital plan with a one-month investment duration.', features: ['120% total ROI', '$100,000+ Investment', '1 Month Duration', '5% Referral Bonus', 'VIP Account Support'] },
  ]

  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    })
  }
  console.log('✅ Investment plans seeded (4 plans)')

  // ── Wallet addresses ────────────────────────────────────
  const wallets = [
    { currency: 'BTC', label: 'Bitcoin (BTC)', address: 'Bc1qhgm7yze9p9hfr74q57kellpf35gz4y85tktdh4', network: 'mainnet' },
    { currency: 'ETH', label: 'Ethereum (ETH)', address: '0x29D3554E0e83eCD7De7329763E750B0143635f93', network: 'mainnet' },
    { currency: 'USDT', label: 'Tether (USDT/TRC20)', address: 'TSC9hepwW7mZW1oBmgKJQT3itWuNyKEgmm', network: 'TRC20' },
    { currency: 'XRP', label: 'Ripple (XRP)', address: 'rsMs2ejvc6bBJWNUCQXXYKzKGaYmgd5EpX', network: 'mainnet'}
  ]

  for (const wallet of wallets) {
    await prisma.walletAddress.upsert({
      where: { currency: wallet.currency },
      update: {},
      create: wallet,
    })
  }
  console.log('✅ Wallet addresses seeded')

  // ── Demo transactions and data ──────────────────────────
  const goldPlan = await prisma.plan.findUnique({ where: { name: 'Gold Plan' } })

  await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: 500,
      currency: 'BTC',
      txHash: 'abc123demo456txhash789example',
      note: 'Demo pending deposit — review in admin panel',
    },
  })

  await prisma.kycSubmission.create({
    data: {
      userId: demoUser.id,
      documentType: 'passport',
      documentNumber: 'P12345678',
      frontImageUrl: 'https://via.placeholder.com/400x250/1a1a2e/c9a84c?text=Passport+Front',
      backImageUrl: 'https://via.placeholder.com/400x250/1a1a2e/c9a84c?text=Passport+Back',
      selfieUrl: 'https://via.placeholder.com/400x400/1a1a2e/c9a84c?text=Selfie+with+ID',
      status: 'PENDING',
    },
  })

  if (goldPlan) {
    const pastDate = addDays(new Date(), -1)
    await prisma.investment.create({
      data: {
        userId: demoUser.id,
        planId: goldPlan.id,
        amount: 50,
        expectedProfit: 4,
        status: 'ACTIVE',
        startDate: pastDate,
        endDate: new Date(),
      },
    })
  }

  await prisma.notification.create({
    data: {
      userId: demoUser.id,
      title: '👋 Welcome to AurexConnect',
      message: 'Your account is set up. Complete KYC verification to unlock full access.',
      type: 'info',
      link: '/dashboard/kyc',
    },
  })

  console.log('\n🎉 Seed complete!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Admin:  admin@aurexconnect.com / Admin@123456')
  console.log('  Demo:   demo@aurexconnect.com  / User@123456')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
