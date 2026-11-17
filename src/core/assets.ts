// Total assets = cash + market value of all holdings at today's close.

import type { RunState } from './types'
import { getPrice, round2 } from './trading'

export function calcAssets(run: RunState): number {
  const holdings = run.positions.reduce((sum, p) => {
    const slot = run.slots[p.slotIndex]
    return slot ? sum + getPrice(slot) * p.quantity : sum
  }, 0)
  return round2(run.cash + holdings)
}