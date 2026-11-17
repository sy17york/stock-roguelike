// Creates a brand new run, and holds default settings.

import { GAME } from '../config/game'
import { createInitialSlots } from '../core/market'
import { createRng } from '../core/rng'
import type { RunState, Settings } from '../core/types'
import { createDefaultDecor } from './decor'
import { createDefaultTalents } from './talents'

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  colorScheme: 'greenUp',
  soundOn: true,
  numberFormat: 'full',
}

// seed is passed in (e.g. Date.now()) so this stays a pure function.
export function createNewRun(seed: number): RunState {
  const rng = createRng(seed)
  const slots = createInitialSlots(rng)

  return {
    day: 1,
    cash: GAME.startingCash,
    slots,
    positions: [],
    talents: createDefaultTalents(),
    decor: createDefaultDecor(),
    messages: { system: [], unread: false },
    stats: {
      buyCount: 0,
      sellCount: 0,
      winCount: 0,
      lossCount: 0,
      totalWinAmount: 0,
      totalLossAmount: 0,
      maxSingleWin: 0,
      maxSingleLoss: 0,
      currentStreak: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,
      totalFees: 0,
      closedPositionCount: 0,
      totalHoldingDays: 0,
      peakCash: GAME.startingCash,
    },
    lastRefreshDay: null,
    rngSeed: rng.state(),
  }
}