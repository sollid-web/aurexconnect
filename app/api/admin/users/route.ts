import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { addDays } from 'date-fns'
import { balanceAdjustmentEmail, investmentActivatedEmail, passwordResetEmail, sendEmail } from '@/lib/email'
import { createHash, randomBytes } from 'crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

async function audit(adminId: string, targetUserId: string, action: string, details?: string) {
  await prisma.adminAuditLog.create({ data: { adminId, targetUserId, action, details } }).catch(error => console.error('[Admin audit]', error))
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
})

const createUserSchema = profileSchema.extend({ role: z.enum(['USER', 'ADMIN']).default('USER') })

// ── POST — create a managed account ───────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const input = createUserSchema.parse(await req.json())
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })
    if (existing) return NextResponse.json({ error: 'That email address is already in use' }, { status: 409 })

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const temporaryPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 12)
    const user = await prisma.user.create({
      data: { ...input, password: temporaryPassword, emailVerified: new Date(), isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
    })
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } })
    await sendEmail(user.email, passwordResetEmail(user.fullName, rawToken))
    await audit(session.user.id, user.id, 'CREATE_USER', `${user.email} · ${user.role}`)
    return NextResponse.json({ message: `User created. A secure password setup link was sent to ${user.email}.`, user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('[Admin create user]', error)
    return NextResponse.json({ error: 'Could not create user' }, { status: 500 })
  }
}

// ── GET — list users with search + pagination ─────────────────────────
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { fullName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        balance: true,
        totalDeposited: true,
        totalProfit: true,
        totalWithdrawn: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        _count: { select: { investments: true, transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, limit })
}

// ── GET single user detail ────────────────────────────────────────────
// Called as /api/admin/users?userId=xxx&detail=true
export async function HEAD() {
  return NextResponse.json({})
}

// ── PATCH — all admin actions on a user ──────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { userId, action } = body

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // ── Toggle active/suspended ─────────────────────────────────────────
  if (action === 'toggleActive') {
    if (userId === session.user.id) return NextResponse.json({ error: 'You cannot suspend your own admin account' }, { status: 400 })
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    })

    await audit(session.user.id, userId, updated.isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER')

    await createNotification(
      userId,
      updated.isActive ? '✅ Account Reactivated' : '⚠️ Account Suspended',
      updated.isActive
        ? 'Your account has been reactivated. You can now access all platform features.'
        : 'Your account has been suspended. Please contact support for assistance.',
      updated.isActive ? 'success' : 'warning',
      '/dashboard'
    )

    return NextResponse.json({ message: `User ${updated.isActive ? 'activated' : 'suspended'}`, user: updated })
  }

  // ── Update profile fields ───────────────────────────────────────────
  if (action === 'updateProfile') {
    let profile: z.infer<typeof profileSchema>
    try {
      profile = profileSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      throw error
    }
    const emailOwner = await prisma.user.findFirst({ where: { email: profile.email, NOT: { id: userId } }, select: { id: true } })
    if (emailOwner) return NextResponse.json({ error: 'That email address is already in use' }, { status: 409 })
    const updated = await prisma.user.update({ where: { id: userId }, data: profile })
    await audit(session.user.id, userId, 'UPDATE_PROFILE', `Updated profile for ${updated.email}`)
    return NextResponse.json({ message: 'User profile updated', user: updated })
  }

  // ── Grant or remove administrator role ──────────────────────────────
  if (action === 'setRole') {
    if (userId === session.user.id) return NextResponse.json({ error: 'You cannot change your own admin role' }, { status: 400 })
    if (body.role !== 'ADMIN' && body.role !== 'USER') return NextResponse.json({ error: 'Role must be ADMIN or USER' }, { status: 400 })
    const updated = await prisma.user.update({ where: { id: userId }, data: { role: body.role } })
    await audit(session.user.id, userId, body.role === 'ADMIN' ? 'GRANT_ADMIN_ROLE' : 'REMOVE_ADMIN_ROLE')
    return NextResponse.json({ message: `${updated.fullName} is now ${body.role === 'ADMIN' ? 'an administrator' : 'a standard user'}`, user: updated })
  }

  // ── Send a single-use password-reset link ────────────────────────────
  if (action === 'sendPasswordReset') {
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
    ])
    await sendEmail(user.email, passwordResetEmail(user.fullName, rawToken))
    await audit(session.user.id, userId, 'SEND_PASSWORD_RESET')
    return NextResponse.json({ message: 'Password reset link sent to the user email address' })
  }

  // ── Credit balance ──────────────────────────────────────────────────
  if (action === 'creditBalance') {
    const { amount, note } = body
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
          totalProfit: { increment: amount },
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'PROFIT',
          status: 'COMPLETED',
          amount,
          note: note || 'Admin credit',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      }),
    ])

    await createNotification(
      userId,
      '💰 Balance Credited',
      `$${amount.toFixed(2)} has been credited to your account${note ? ` — ${note}` : ''}.`,
      'success',
      '/dashboard'
    )

    await audit(session.user.id, userId, 'CREDIT_BALANCE', `$${amount.toFixed(2)}${note ? ` — ${note}` : ''}`)
    await sendEmail(user.email, balanceAdjustmentEmail(user.fullName, amount, 'credited', note)).catch(error => console.error('[Balance email]', error))
    return NextResponse.json({ message: `$${amount} credited to ${user.fullName}`, balance: updated.balance })
  }

  // ── Debit balance ───────────────────────────────────────────────────
  if (action === 'debitBalance') {
    const { amount, note } = body
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    if (user.balance < amount) {
      return NextResponse.json({ error: `User only has $${user.balance.toFixed(2)} — cannot debit $${amount}` }, { status: 400 })
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: amount },
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amount,
          note: note || 'Admin debit',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      }),
    ])

    await createNotification(
      userId,
      '⚠️ Balance Adjusted',
      `$${amount.toFixed(2)} has been debited from your account${note ? ` — ${note}` : ''}. Contact support if you have questions.`,
      'warning',
      '/dashboard'
    )

    await audit(session.user.id, userId, 'DEBIT_BALANCE', `$${amount.toFixed(2)}${note ? ` — ${note}` : ''}`)
    await sendEmail(user.email, balanceAdjustmentEmail(user.fullName, amount, 'debited', note)).catch(error => console.error('[Balance email]', error))
    return NextResponse.json({ message: `$${amount} debited from ${user.fullName}`, balance: updated.balance })
  }

  // ── Assign investment plan to user (admin-side purchase) ────────────
  if (action === 'assignInvestment') {
    const { planId, amount, bypassBalance } = body

    if (!planId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'planId and amount are required' }, { status: 400 })
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 404 })
    }

    if (amount < plan.minAmount || (plan.maxAmount !== null && amount > plan.maxAmount)) {
      return NextResponse.json(
        { error: `Amount must be at least $${plan.minAmount}${plan.maxAmount === null ? '' : ` and no more than $${plan.maxAmount}`} for this plan` },
        { status: 400 }
      )
    }

    // bypassBalance = admin can assign without user having enough balance
    // (admin is manually assigning, funds may have been deposited externally)
    if (!bypassBalance && user.balance < amount) {
      return NextResponse.json(
        { error: `User balance ($${user.balance.toFixed(2)}) is insufficient. Enable "bypass balance check" to proceed anyway.` },
        { status: 400 }
      )
    }

    const expectedProfit = (amount * plan.roiPercent) / 100
    const endDate = addDays(new Date(), plan.durationDays)

    const ops: any[] = [
      prisma.investment.create({
        data: {
          userId,
          planId: plan.id,
          amount,
          expectedProfit,
          endDate,
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount,
          note: `Admin-assigned investment — ${plan.name}`,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
        },
      }),
    ]

    // Only deduct balance if not bypassing AND user has enough
    if (!bypassBalance) {
      ops.push(
        prisma.user.update({
          where: { id: userId },
          data: { balance: { decrement: amount } },
        })
      )
    } else {
      // Bypass: we still update totalDeposited for accounting
      ops.push(
        prisma.user.update({
          where: { id: userId },
          data: { totalDeposited: { increment: amount } },
        })
      )
    }

    const results = await prisma.$transaction(ops)
    const investment = results[0] as any
    await audit(session.user.id, userId, 'ASSIGN_INVESTMENT', `${plan.name} · $${amount.toFixed(2)}`)

    await createNotification(
      userId,
      '🚀 Investment Activated',
      `An investment of $${amount.toFixed(2)} in the ${plan.name} has been activated on your account. Total ROI of $${expectedProfit.toFixed(2)} will be credited in daily installments over ${plan.durationDays} day(s).`,
      'success',
      '/dashboard'
    )

    await sendEmail(user.email, investmentActivatedEmail(user.fullName, plan.name, amount, expectedProfit, plan.durationDays)).catch(error => console.error('[Investment email]', error))
    return NextResponse.json({
      message: `${plan.name} investment of $${amount} assigned to ${user.fullName}`,
      investment,
      expectedProfit,
      endDate,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
