import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { z } from 'zod'
import { depositSubmittedEmail, sendEmail, withdrawalSubmittedEmail } from '@/lib/email'

const depositSchema = z.object({
  amount: z.number().min(10, 'Minimum deposit is $10'),
  currency: z.string().trim().min(2).max(20),
  paymentMethodId: z.string().min(1).max(128),
  paymentMethodUpdatedAt: z.string().datetime({ offset: true }),
  txHash: z.string().min(5, 'Transaction hash is required'),
  proofImageUrl: z.string().url().optional(),
})

const withdrawSchema = z.object({
  amount: z.number().min(10, 'Minimum withdrawal is $10'),
  walletAddress: z.string().min(10, 'Invalid wallet address'),
  currency: z.string().default('BTC'),
})

// POST — create a deposit or withdrawal request
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { type } = body

    // ── DEPOSIT ─────────────────────────────────────────────
    if (type === 'DEPOSIT') {
      const { amount, currency, paymentMethodId, paymentMethodUpdatedAt, txHash, proofImageUrl } = depositSchema.parse(body)

      const paymentMethod = await prisma.walletAddress.findFirst({ where: { id: paymentMethodId, currency, isActive: true }, select: { id: true, updatedAt: true } })
      if (!paymentMethod) return NextResponse.json({ error: 'This payment method is no longer available. Reload the deposit page and choose an active method.' }, { status: 400 })
      if (paymentMethod.updatedAt.getTime() !== new Date(paymentMethodUpdatedAt).getTime()) {
        return NextResponse.json({ error: 'This payment method changed after you opened the page. Reload it and verify the current deposit address before submitting.' }, { status: 409 })
      }

      // Check for duplicate txHash
      const existing = await prisma.transaction.findFirst({ where: { txHash } })
      if (existing) {
        return NextResponse.json({ error: 'This transaction hash has already been submitted' }, { status: 400 })
      }

      // Create PENDING deposit — admin must approve before balance is credited
      const transaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          type: 'DEPOSIT',
          status: 'PENDING',
          amount,
          currency,
          txHash,
          proofImageUrl,
          note: `Deposit via ${currency}`,
        },
      })

      await createNotification(
        session.user.id,
        Notifs.depositPending(amount).title,
        Notifs.depositPending(amount).message,
        'info',
        '/dashboard/transactions'
      )

      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, fullName: true } })
      if (user) await sendEmail(user.email, depositSubmittedEmail(user.fullName, amount, currency)).catch(error => console.error('[Deposit email]', error))
      return NextResponse.json({ message: 'Deposit submitted for review', transaction }, { status: 201 })
    }

    // ── WITHDRAWAL ──────────────────────────────────────────
    if (type === 'WITHDRAWAL') {
      const { amount, walletAddress, currency } = withdrawSchema.parse(body)

      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (user.balance < amount) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      }

      // Deduct balance immediately and hold pending admin approval
      const [transaction] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            type: 'WITHDRAWAL',
            status: 'PENDING',
            amount,
            currency,
            walletAddress,
            note: `Withdrawal to ${currency} wallet`,
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: {
            balance: { decrement: amount },
            totalWithdrawn: { increment: amount },
          },
        }),
      ])

      await createNotification(
        session.user.id,
        Notifs.withdrawalPending(amount).title,
        Notifs.withdrawalPending(amount).message,
        'info',
        '/dashboard/transactions'
      )

      await sendEmail(user.email, withdrawalSubmittedEmail(user.fullName, amount, currency)).catch(error => console.error('[Withdrawal email]', error))
      return NextResponse.json({ message: 'Withdrawal request submitted', transaction }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Transaction error:', error)
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 })
  }
}

// GET — user's transaction history
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(transactions)
}
