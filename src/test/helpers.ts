// Shared helpers for tests. A flat slot has the same price on every candle,
// so trade results can be checked by hand.

import { GAME } from '../config/game'
import type { Candle, RunState, Slot } from '../core/types'
import { createNewRun } from '../state/newRun'

export function flatSlot(price: number): Slot {
  const candle: Candle = { open: price, high: price, low: price, close: price, volume: 100 }
  return {
    series: {
      stockId: 'TEST',
      industry: 'tech',
      startIndex: 0,
      candles: Array.from({ length: GAME.seriesLength }, () => candle),
    },
    cursor: GAME.initialCursor,
  }
}

// A fresh run whose only slot is a flat-priced stock
export function runWithSlot(price: number): RunState {
  return { ...createNewRun(1), slots: [flatSlot(price)] }
}

// The same run, but the price has moved (and optionally the day)
export function at(run: RunState, price: number, day = run.day): RunState {
  return { ...run, day, slots: [flatSlot(price)] }
}