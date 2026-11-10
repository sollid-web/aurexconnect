export const APX_SYMBOL = 'APX'
export const APX_CHAIN = 'BNB Smart Chain (BSC)'
export const APX_CONTRACT = '0x8d6032443cb7B23c134094c8921F1F37824EA3a2'
export const USD_PER_APX = 0.00072

/** Convert USD-denominated plan profit to APX using APXFund's published internal redemption rate. */
export function usdToApx(usdAmount: number): number {
  if (!Number.isFinite(usdAmount) || usdAmount < 0) {
    throw new RangeError('USD amount must be a finite, non-negative number')
  }
  return Number((usdAmount / USD_PER_APX).toFixed(8))
}

export function formatApx(amount: number): string {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount)} APX`
}
