// Trading rules

export const TRADING = {
  // Fee rate: charged on both buy and sell, on the trade amount (price x quantity)
  feeRate: 0.001, // 0.1%

  // Minimum tradable quantity (whole shares)
  minQuantity: 1,
} as const