// Room decoration rules. Unlocked by the run's peak cash (cash after sells).
// Unrealized gains on open positions do NOT count.
// Only ids and numbers live here. Display text lives in i18n.

// Furniture: 4 pieces, each has an "old" and a "new" version. One is always shown.
export const FURNITURE_IDS = ['bed', 'desk', 'window', 'wardrobe'] as const
export type FurnitureId = (typeof FURNITURE_IDS)[number]

export type Variant = 'old' | 'new'

// Accessory groups: the 4 furniture pieces plus two groups that belong to no furniture.
// Order here = order in the decor panel.
export const ACCESSORY_GROUPS = ['bed', 'desk', 'window', 'wardrobe', 'wall', 'floor'] as const
export type AccessoryGroup = (typeof ACCESSORY_GROUPS)[number]

// Peak cash needed to unlock the "new" version of each furniture piece.
export const NEW_FURNITURE_CASH: Record<FurnitureId, number> = {
  wardrobe: 20_000,
  desk: 50_000,
  window: 200_000,
  bed: 500_000,
}

export interface Accessory {
  id: string
  group: AccessoryGroup
  requiredCash: number
}

// Optional decorations. Each can be switched on or off freely once unlocked.
// Positions are fixed in the art, so they work with both old and new furniture.
export const ACCESSORIES = [
  { id: 'clothes', group: 'wardrobe', requiredCash: 25_000 },
  { id: 'shoes', group: 'wardrobe', requiredCash: 30_000 },
  { id: 'hat', group: 'wardrobe', requiredCash: 40_000 },
  { id: 'books', group: 'desk', requiredCash: 60_000 },
  { id: 'console', group: 'desk', requiredCash: 75_000 },
  { id: 'ornament', group: 'desk', requiredCash: 90_000 },
  { id: 'clock', group: 'wall', requiredCash: 120_000 },
  { id: 'curtain', group: 'window', requiredCash: 250_000 },
  { id: 'poster', group: 'wall', requiredCash: 300_000 },
  { id: 'plush', group: 'bed', requiredCash: 650_000 },
  { id: 'frame', group: 'wall', requiredCash: 800_000 },
  { id: 'rug', group: 'floor', requiredCash: 1_000_000 },
] as const satisfies readonly Accessory[]

export type AccessoryId = (typeof ACCESSORIES)[number]['id']