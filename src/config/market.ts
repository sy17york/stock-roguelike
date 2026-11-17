// Market data rules: industries, anonymous id salt, price filter.

// Industry ids. Display text lives in i18n (industry.<id>).
export const INDUSTRIES = [
  'tech',
  'semiconductor',
  'internet',
  'finance',
  'healthcare',
  'energy',
  'utilities',
  'materials',
  'industrial',
  'autos',
  'retail',
  'consumerStaples',
  'realEstate',
] as const

export type IndustryId = (typeof INDUSTRIES)[number]

export const MARKET = {
  // Salt for the anonymous id hash. Change it before release and keep it private.
  anonIdSalt: 'change-me-before-release',

  // Salt for the start price of each segment. Changing it changes every price in every
  // existing save, so treat it like a data version bump.
  priceSalt: 'change-me-before-release-too',

  // Every segment is rescaled so the close on the first visible day lands in this range.
  // The landing point is derived from (stockId, startIndex), so it is the same on every load.
  minStartPrice: 50,
  maxStartPrice: 300,
} as const