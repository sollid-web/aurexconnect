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
  const matured = input.now >= input.endDate
  if (!matured) return null

  const elapsedInstallments = input.durationDays
  const targetPaid = Number(input.expectedProfit.toFixed(2))
  const roiDue = Number(Math.max(0, targetPaid - input.roiPaid).toFixed(2))

  const nextRoiPaid = Number((input.roiPaid + roiDue).toFixed(2))
  const shouldComplete = true
  return {
    elapsedInstallments,
    targetPaid,
    roiDue,
    nextRoiPaid,
    matured,
    shouldComplete,
    // Principal is a USD ledger balance. Plan profit is converted to APX by
    // the payout route and must never be added to the USD balance here.
    creditAmount: input.principal,
  }
}
