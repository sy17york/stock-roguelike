// Decoration rules. Pure functions: state in, new state or an error out.
// Unlocked status is never stored: it is derived from the run's peak cash.

import { ACCESSORIES, FURNITURE_IDS, NEW_FURNITURE_CASH } from '../config/decorations'
import type { FurnitureId, Variant } from '../config/decorations'
import type { DecorState, RunState } from '../core/types'

export type DecorError = 'notUnlockedDecor' | 'unknownDecor'

export type DecorResult =
  | { ok: true; decor: DecorState }
  | { ok: false; reason: DecorError }

export function isUnlocked(requiredCash: number, peakCash: number): boolean {
  return peakCash >= requiredCash
}

export function isVariantUnlocked(
  furniture: FurnitureId,
  variant: Variant,
  peakCash: number,
): boolean {
  // The old version is always available
  return variant === 'old' || isUnlocked(NEW_FURNITURE_CASH[furniture], peakCash)
}

export function isAccessoryUnlocked(id: string, peakCash: number): boolean {
  const item = ACCESSORIES.find((a) => a.id === id)
  return item !== undefined && isUnlocked(item.requiredCash, peakCash)
}

// New run: every furniture piece is the old version, no accessory is on.
export function createDefaultDecor(): DecorState {
  return {
    variants: { bed: 'old', desk: 'old', window: 'old', wardrobe: 'old' },
    accessories: [],
  }
}

// When peak cash rises, switch on every accessory whose threshold was just crossed.
// New furniture versions are NOT switched automatically: the player chooses.
export function syncDecor(decor: DecorState, oldPeak: number, newPeak: number): DecorState {
  if (newPeak <= oldPeak) return decor

  const added = ACCESSORIES.filter(
    (a) =>
      a.requiredCash > oldPeak &&
      a.requiredCash <= newPeak &&
      !decor.accessories.includes(a.id),
  ).map((a) => a.id)

  if (added.length === 0) return decor
  return { ...decor, accessories: [...decor.accessories, ...added] }
}

// Convenience for the reducer: compare peak cash before and after an action.
export function syncRunDecor(prev: RunState, next: RunState): RunState {
  const decor = syncDecor(next.decor, prev.stats.peakCash, next.stats.peakCash)
  return decor === next.decor ? next : { ...next, decor }
}

export function setVariant(
  decor: DecorState,
  furniture: FurnitureId,
  variant: Variant,
  peakCash: number,
): DecorResult {
  if (!(FURNITURE_IDS as readonly string[]).includes(furniture)) {
    return { ok: false, reason: 'unknownDecor' }
  }
  if (variant !== 'old' && variant !== 'new') return { ok: false, reason: 'unknownDecor' }
  if (!isVariantUnlocked(furniture, variant, peakCash)) {
    return { ok: false, reason: 'notUnlockedDecor' }
  }
  return { ok: true, decor: { ...decor, variants: { ...decor.variants, [furniture]: variant } } }
}

export function toggleAccessory(decor: DecorState, id: string, peakCash: number): DecorResult {
  const item = ACCESSORIES.find((a) => a.id === id)
  if (!item) return { ok: false, reason: 'unknownDecor' }
  if (!isUnlocked(item.requiredCash, peakCash)) return { ok: false, reason: 'notUnlockedDecor' }

  const on = decor.accessories.includes(id)
  return {
    ok: true,
    decor: {
      ...decor,
      accessories: on ? decor.accessories.filter((a) => a !== id) : [...decor.accessories, id],
    },
  }
}