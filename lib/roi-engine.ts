import { prisma } from '@/lib/prisma'
import { createNotification, Notifs } from '@/lib/notifications'
import { dailyRoiEmail, referralBonusEmail, sendEmail } from '@/lib/email'
import { calculateRoiCredit } from '@/lib/roi'

export type RoiRunResult = {
  success: true
  runId: string
  investmentsFound: number
  investmentsDone: number
  totalProfitPaid: number
  durationMs: number
  errors?: string[]
  affectedUserIds: string[]
}

export async function processRoiInvestments(): Promise<RoiRunResult> {
  const startTime = Date.now()
  let investmentsFound = 0
  let investmentsDone = 0
  let totalProfitPaid = 0
  const errors: string[] = []
  const affectedUserIds = new Set<string>()

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
          const current = await tx.investment.findUnique({ where: { id: investment.id }, include: { plan: true, user: true } })
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

          const advanced = await tx.investment.updateMany({
            where: { id: current.id, status: 'ACTIVE', roiPaid: current.roiPaid },
            data: {
              roiPaid: nextRoiPaid,
              lastRoiPaidAt: roiDue > 0 ? now : current.lastRoiPaidAt,
              ...(shouldComplete ? { status: 'COMPLETED', completedAt: now } : {}),
            },
          })
          if (advanced.count !== 1) return null

          if (creditAmount > 0) {
            await tx.user.update({
              where: { id: current.userId },
              data: { balance: { increment: creditAmount }, totalProfit: { increment: roiDue } },
            })
          }
          if (roiDue > 0) {
            await tx.transaction.create({
              data: { userId: current.userId, type: 'PROFIT', status: 'COMPLETED', amount: roiDue, note: `${shouldComplete ? 'Final ' : 'Daily '}ROI from ${current.plan.name}` },
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
            totalPaid: nextRoiPaid,
            expectedProfit: current.expectedProfit,
            matured: shouldComplete,
            referral,
          }
        })

        if (!result) continue
        investmentsDone++
        totalProfitPaid += result.roiDue
        affectedUserIds.add(result.user.id)
        if (result.referral) affectedUserIds.add(result.referral.id)

        if (result.roiDue > 0 || result.matured) {
          const notification = Notifs.dailyRoi(result.roiDue, result.planName, result.matured)
          await createNotification(result.user.id, notification.title, notification.message, notification.type, notification.link)
          await sendEmail(result.user.email, dailyRoiEmail(result.user.fullName, result.planName, result.roiDue, result.totalPaid, result.expectedProfit, result.matured)).catch(error => console.error('[ROI email]', error))
        }
        if (result.referral) {
          const referralNotification = Notifs.referralBonus(result.referral.amount)
          await createNotification(result.referral.id, referralNotification.title, referralNotification.message, referralNotification.type, referralNotification.link)
          await sendEmail(result.referral.email, referralBonusEmail(result.referral.fullName, result.referral.amount)).catch(error => console.error('[Referral email]', error))
        }
      } catch (error: any) {
        const message = `Investment ${investment.id}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(message)
        console.error('[ROI Engine]', message)
      }
    }

    const log = await prisma.roiProcessingLog.create({
      data: { investmentsFound, investmentsDone, totalProfitPaid, errors: errors.length ? errors.join('\n') : null },
      select: { id: true },
    })
    return {
      success: true,
      runId: log.id,
      investmentsFound,
      investmentsDone,
      totalProfitPaid,
      durationMs: Date.now() - startTime,
      errors: errors.length ? errors : undefined,
      affectedUserIds: Array.from(affectedUserIds),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ROI Engine] Fatal error:', error)
    await prisma.roiProcessingLog.create({ data: { investmentsFound, investmentsDone, totalProfitPaid, errors: `Fatal: ${message}` } })
    throw error
  }
}
