# 🏦 AurexConnect — Full-Stack Investment Platform
### Built with Next.js 14 · PostgreSQL (Supabase) · NextAuth · Tailwind CSS · Vercel

---

## 📁 Project Structure

```
aurexconnect/
├── app/
│   ├── page.tsx                     ← Landing page (public)
│   ├── layout.tsx                   ← Root layout + session provider
│   ├── globals.css                  ← Global styles + CSS variables
│   ├── providers.tsx                ← NextAuth SessionProvider
│   │
│   ├── auth/
│   │   ├── login/page.tsx           ← Login page
│   │   └── register/page.tsx        ← Register page
│   │
│   ├── dashboard/
│   │   ├── layout.tsx               ← Sidebar + protected layout
│   │   ├── page.tsx                 ← Portfolio overview
│   │   ├── deposit/page.tsx         ← Deposit funds
│   │   ├── withdraw/page.tsx        ← Withdraw funds
│   │   ├── plans/page.tsx           ← Investment plans
│   │   ├── transactions/page.tsx    ← Transaction history
│   │   └── profile/page.tsx         ← User profile
│   │
│   ├── admin/
│   │   └── page.tsx                 ← Admin panel (user management)
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts  ← NextAuth handler
│       │   └── register/route.ts       ← User registration
│       ├── user/me/route.ts            ← Get current user data
│       ├── plans/route.ts              ← Investment plans CRUD
│       ├── investments/route.ts        ← Create/list investments
│       ├── transactions/route.ts       ← Deposit/withdraw requests
│       └── admin/users/route.ts        ← Admin user management
│
├── lib/
│   ├── prisma.ts                    ← Prisma client singleton
│   ├── auth.ts                      ← NextAuth configuration
│   └── utils.ts                     ← Helper functions
│
├── prisma/
│   ├── schema.prisma                ← Database schema
│   └── seed.js                      ← Seed data (plans, admin user)
│
├── types/
│   └── next-auth.d.ts               ← Type extensions
│
├── .env.example                     ← Environment variable template
├── package.json
├── tailwind.config.js
├── next.config.js
└── tsconfig.json
```

--

## ⚡ STEP-BY-STEP SETUP GUIDE

### STEP 1 — Clone / Set Up the Project

```bash
# If starting fresh, create the Next.js app and copy all files into it
# OR just copy this entire folder and run:
npm install
```

---

### STEP 2 — Set Up Supabase (Free PostgreSQL Database)

1. Go to **https://supabase.com** and create a free account
2. Click **"New Project"** → enter a name (e.g. `aurexconnect`) and a strong DB password
3. Wait ~2 minutes for provisioning
4. Go to **Settings → Database → Connection String → URI**
5. Copy the URI — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres
   ```

---

### STEP 3 — Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env.local
```

Then edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:YourPassword@db.xxxxx.supabase.co:5432/postgres"

NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

NEXT_PUBLIC_APP_NAME="AurexConnect"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
# Paste the output into NEXTAUTH_SECRET
```

---

### STEP 4 — Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Seed the database with plans and demo users
npm run db:seed
```

After seeding, you'll have:
- **Admin:** admin@aurexconnect.site / Admin@123456
- **Demo User:** demo@aurexconnect.site / User@123456
- **4 Investment Plans:** Gold, Silver, Bronze, Diamond
- **3 Wallet Addresses:** BTC, ETH, USDT

---

### STEP 5 — Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

### STEP 6 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then add environment variables in Vercel dashboard:
# Project → Settings → Environment Variables
# Add all variables from your .env.local
```

**Or deploy via GitHub:**
1. Push code to GitHub
2. Go to https://vercel.com → Import Repository
3. Add environment variables in the dashboard
4. Set `NEXTAUTH_URL` to the production URL: `https://aurexconnect.site`

---

## 🗄️ Database Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | Investor accounts, balances, referral codes |
| `plans` | Investment plan definitions (Gold, Silver, Bronze, Diamond) |
| `investments` | Active/completed user investments |
| `transactions` | All financial movements (deposit, withdraw, profit) |
| `wallet_addresses` | Admin crypto addresses for deposits |

---

## 🔐 Authentication Flow

```
User visits /dashboard
    ↓ Not logged in?
    ↓ Redirected to /auth/login
    ↓ Submits credentials
    ↓ NextAuth verifies via bcrypt
    ↓ JWT token issued (30 day session)
    ↓ Redirected to /dashboard
```

---

## 💰 Investment Flow

```
User selects plan → enters amount
    ↓
API checks: balance ≥ amount AND minAmount ≤ amount ≤ maxAmount
    ↓
Prisma transaction:
  1. Create Investment record
  2. Deduct from user balance
  3. Create Transaction record
    ↓
Investment marked ACTIVE until endDate
    ↓ (future: cron job)
Profit credited, status → COMPLETED
```

---

## ⚙️ Features Included

### ✅ Done
- [x] Public landing page (hero, plans, services, testimonials)
- [x] User registration + login (NextAuth + bcrypt)
- [x] Protected dashboard with sidebar
- [x] Portfolio overview (balance, deposits, profit, withdrawals)
- [x] Investment plans page with plan selector
- [x] Investment creation with balance check
- [x] Deposit page (manual crypto with TX hash confirmation)
- [x] Withdrawal request system
- [x] Transaction history with filters
- [x] Referral code system
- [x] Admin panel (user management, credit balance, suspend users)
- [x] Mobile responsive design

### 🚧 Next Steps to Add
- [ ] **Email notifications** (Nodemailer/Resend) on deposit/withdrawal
- [ ] **Cron job** to auto-complete investments and credit profits
  - Use Vercel Cron or a separate service
- [ ] **Profile page** — edit name, phone, change password
- [ ] **KYC/verification** — document upload
- [ ] **Admin: approve deposits** — manual deposit confirmation
- [ ] **Admin: approve withdrawals** — process pending withdrawals
- [ ] **2FA** — TOTP-based two-factor authentication
- [ ] **Live chat** — integrate Tawk.to or Crisp

---

## 🕐 Cron Job for Auto-Profit (Add After Launch)

Create `app/api/cron/process-investments/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dueInvestments = await prisma.investment.findMany({
    where: { status: 'ACTIVE', endDate: { lte: new Date() } },
    include: { plan: true },
  })

  for (const inv of dueInvestments) {
    const totalReturn = inv.amount + inv.expectedProfit
    await prisma.$transaction([
      prisma.investment.update({ where: { id: inv.id }, data: { status: 'COMPLETED', completedAt: new Date() } }),
      prisma.user.update({ where: { id: inv.userId }, data: {
        balance: { increment: totalReturn },
        totalProfit: { increment: inv.expectedProfit },
      }}),
      prisma.transaction.create({ data: {
        userId: inv.userId, type: 'PROFIT', status: 'COMPLETED',
        amount: inv.expectedProfit, note: `Profit from ${inv.plan.name}`,
      }}),
    ])
  }

  return NextResponse.json({ processed: dueInvestments.length })
}
```

Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/process-investments", "schedule": "0 * * * *" }]
}
```

---

## 🌐 Custom Domain (Optional)

1. Buy a domain (e.g. aurexconnect.site from Namecheap)
2. In Vercel: Project → Settings → Domains → Add domain
3. Point your DNS nameservers to Vercel
4. Update `NEXTAUTH_URL` to `https://aurexconnect.site`

---

## 🛠️ Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Apply schema changes to DB
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:seed      # Re-seed the database
npx prisma generate  # Regenerate Prisma client after schema changes
```

---

*AurexConnect — Built for scale. Ready for launch.*
