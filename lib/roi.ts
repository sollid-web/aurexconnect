export const DAY_MS = 24 * 60 * 60 * 1000

export type RoiCalculationInput = {
  now: Date
  startDate: Date
  endDate: Date
  durationDays: number
  expectedProfit: number
  roiPaid: number
  principal: number
}

export function calculateRoiCredit(input: RoiCalculationInput) {
  const elapsedInstallments = Math.min(
    input.durationDays,
    Math.max(0, Math.floor((input.now.getTime() - input.startDate.getTime()) / DAY_MS))
  )
  const targetPaid = Number(Math.min(
    input.expectedProfit,
    (input.expectedProfit / input.durationDays) * elapsedInstallments
  ).toFixed(2))
  const roiDue = Number(Math.max(0, targetPaid - input.roiPaid).toFixed(2))
  const matured = input.now >= input.endDate
  if (roiDue <= 0 && !matured) return null

  const nextRoiPaid = Number((input.roiPaid + roiDue).toFixed(2))
  const shouldComplete = matured && nextRoiPaid >= Number((input.expectedProfit - 0.01).toFixed(2))
  return {
    elapsedInstallments,
    targetPaid,
    roiDue,
    nextRoiPaid,
    matured,
    shouldComplete,
    creditAmount: Number((roiDue + (shouldComplete ? input.principal : 0)).toFixed(2)),
  }
}
