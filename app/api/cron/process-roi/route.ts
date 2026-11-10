import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { apxMaturityEmail, referralBonusEmail, sendEmail } from '@/lib/email'
import { calculateRoiCredit } from '@/lib/roi'
import { isSettingEnabled } from '@/lib/settings'
import { APX_CONTRACT, APX_SYMBOL, USD_PER_APX, usdToApx } from '@/lib/apx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily maturity processor. Vercel invokes this route once per day; investments
 * are finalized only after maturity, returning USD principal and converting
 * the outstanding USD ROI basis to APX. Compare-and-swap keeps runs idempotent.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  let investmentsFound = 0
  let investmentsDone = 0
  let totalProfitBasisUsd = 0
  let totalApxPaid = 0
  const errors: string[] = []

  if (!await isSettingEnabled('roi_enabled', true)) return NextResponse.json({ success: true, skipped: true, reason: 'ROI engine disabled by administrator' })

  try {
    const activeInvestments = await prisma.investment.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true, user: true },
      orderBy: { createdAt: 'asc' },
    })
    investmentsFound = activeInvestments.length

    for (const investment of activeInvestments) {
      try {
        const result = await prisma.$transaction(async tx => {
          const current = await tx.investment.findUnique({
            where: { id: investment.id },
            include: { plan: true, user: true },
          })
          if (!current || current.status !== 'ACTIVE') return null

          const now = new Date()
          const calculation = calculateRoiCredit({
            now,
            startDate: current.startDate,
            endDate: current.endDate,
            durationDays: current.plan.durationDays,
            expectedProfit: current.expectedProfit,
            roiPaid: current.roiPaid,
            principal: current.amount,
          })
          if (!calculation) return null
          const { roiDue, nextRoiPaid, shouldComplete, creditAmount } = calculation
          const apxDue = usdToApx(roiDue)

          // Claim this maturity with compare-and-swap. A scheduled run and an
          // administrator-triggered run can overlap; only one may finalize the
          // investment from the observed roiPaid value.
          const claimed = await tx.investment.updateMany({
            where: { id: current.id, status: 'ACTIVE', roiPaid: current.roiPaid },
            data: {
              roiPaid: nextRoiPaid,
              apxPaid: { increment: apxDue },
              lastRoiPaidAt: roiDue > 0 ? now : current.lastRoiPaidAt,
              ...(shouldComplete ? { status: 'COMPLETED', completedAt: now } : {}),
            },
          })
          if (claimed.count !== 1) return null

          await tx.user.update({
            where: { id: current.userId },
            data: {
              balance: { increment: creditAmount },
              ...(apxDue > 0 ? {
                apxBalance: { increment: apxDue },
                totalApxEarned: { increment: apxDue },
              } : {}),
            },
          })

          if (apxDue > 0) {
            await tx.transaction.create({
              data: {
                userId: current.userId,
                type: 'PROFIT',
                status: 'COMPLETED',
                amount: apxDue,
                currency: APX_SYMBOL,
                note: `Maturity ROI from ${current.plan.name}: $${roiDue.toFixed(2)} USD basis converted at $${USD_PER_APX}/${APX_SYMBOL}; internal APX wallet credit. Contract ${APX_CONTRACT}`,
              },
            })
          }

          let referral: { id: string; email: string; fullName: string; amount: number } | null = null
          if (shouldComplete && current.user.referredBy) {
            const referralBonus = Number(((current.amount * current.plan.referralBonus) / 100).toFixed(2))
            const referrer = await tx.user.findUnique({ where: { id: current.user.referredBy }, select: { id: true, email: true, fullName: true, isActive: true } })
            if (referrer?.isActive) {
              await tx.user.update({ where: { id: referrer.id }, data: { balance: { increment: referralBonus }, totalProfit: { increment: referralBonus } } })
              await tx.transaction.create({ data: { userId: referrer.id, type: 'REFERRAL_BONUS', status: 'COMPLETED', amount: referralBonus, note: `Referral bonus from ${current.user.fullName}'s ${current.plan.name} investment` } })
              referral = { id: referrer.id, email: referrer.email, fullName: referrer.fullName, amount: referralBonus }
            }
          }

          return {
            user: { id: current.userId, email: current.user.email, fullName: current.user.fullName },
            planName: current.plan.name,
            roiDue,
            apxAmount: apxDue,
            totalApxPaid: Number((current.apxPaid + apxDue).toFixed(8)),
            principalUsd: shouldComplete ? creditAmount : 0,
            expectedProfit: current.expectedProfit,
            matured: shouldComplete,
            referral,
          }
        })

        if (!result) continue
        investmentsDone++
        totalProfitBasisUsd += result.roiDue
        totalApxPaid += result.apxAmount

        if (result.matured) {
          const notification = Notifs.apxMaturity(result.apxAmount, result.principalUsd, result.planName, result.roiDue)
          await createNotification(result.user.id, notification.title, notification.message, notification.type, notification.link)
          if (await isSettingEnabled('roi_email_enabled', true)) await sendEmail(result.user.email, apxMaturityEmail(result.user.fullName, result.planName, result.principalUsd, result.roiDue, result.apxAmount, result.totalApxPaid)).catch(error => console.error('[ROI email]', error))
        }
        if (result.referral) {
          const referralNotification = Notifs.referralBonus(result.referral.amount)
          await createNotification(result.referral.id, referralNotification.title, referralNotification.message, referralNotification.type, referralNotification.link)
          await sendEmail(result.referral.email, referralBonusEmail(result.referral.fullName, result.referral.amount)).catch(error => console.error('[Referral email]', error))
        }
      } catch (error: any) {
        const message = `Investment ${investment.id}: ${error.message}`
        errors.push(message)
        console.error('[ROI Engine]', message)
      }
    }

    await prisma.roiProcessingLog.create({ data: { investmentsFound, investmentsDone, totalProfitPaid: totalProfitBasisUsd, totalApxPaid, errors: errors.length ? errors.join('\n') : null } })
    return NextResponse.json({ success: true, investmentsFound, investmentsDone, totalProfitBasisUsd, totalApxPaid, durationMs: Date.now() - startTime, errors: errors.length ? errors : undefined })
  } catch (error: any) {
    console.error('[ROI Engine] Fatal error:', error)
    await prisma.roiProcessingLog.create({ data: { investmentsFound, investmentsDone, totalProfitPaid: totalProfitBasisUsd, totalApxPaid, errors: `Fatal: ${error.message}` } })
    return NextResponse.json({ error: 'ROI engine failed' }, { status: 500 })
  }
}
