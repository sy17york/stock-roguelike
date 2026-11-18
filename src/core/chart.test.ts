import { describe, expect, it } from 'vitest'
import { GAME } from '../config/game'
import {
  dailyChange,
  getVisibleCandles,
  holdingDays,
  maxVolume,
  positionOf,
  priceRange,
  sliceVisible,
  unrealizedRatio,
} from './chart'
import { createRng } from './rng'
import { pickSeries } from './sampling'
import type { Slot } from './types'

const series = pickSeries(createRng(3), new Set())
const slot: Slot = { series, cursor: GAME.initialCursor + 5 }
const c = series.candles

describe('visible window', () => {
  it('ends at today and has the default length', () => {
    const visible = getVisibleCandles(slot)
    expect(visible).toHaveLength(GAME.visibleBars)
    expect(visible[visible.length - 1]).toBe(c[slot.cursor])
    expect(visible[0]).toBe(c[slot.cursor - GAME.visibleBars + 1])
  })

  it('supports every zoom level', () => {
    for (const n of GAME.zoomLevels) {
      expect(getVisibleCandles(slot, n)).toHaveLength(n)
    }
  })

  it('slices series to the last N values', () => {
    expect(sliceVisible([1, 2, 3, 4, 5], 2)).toEqual([4, 5])
    expect(sliceVisible([1, 2, 3], 10)).toEqual([1, 2, 3])
  })
})

describe('price range and volume', () => {
  it('covers every candle with some padding', () => {
    const visible = getVisibleCandles(slot)
    const range = priceRange(visible)
    expect(visible.every((k) => k.low >= range.min && k.high <= range.max)).toBe(true)
    expect(range.max).toBeGreaterThan(Math.max(...visible.map((k) => k.high)))
    expect(range.min).toBeLessThan(Math.min(...visible.map((k) => k.low)))
  })

  it('handles an empty list and finds the biggest volume', () => {
    expect(priceRange([])).toEqual({ min: 0, max: 1 })
    expect(maxVolume(getVisibleCandles(slot))).toBeGreaterThan(0)
  })
})

describe('daily change and positions', () => {
  it('compares today with yesterday', () => {
    expect(dailyChange(slot)).toBeCloseTo(c[slot.cursor].close / c[slot.cursor - 1].close - 1, 12)
  })

  it('counts holding days from the first buy', () => {
    const pos = { slotIndex: 0, quantity: 5, avgPrice: 100, openedOnDay: 7 }
    expect(holdingDays(10, pos)).toBe(3)
    expect(holdingDays(7, pos)).toBe(0)
    expect(unrealizedRatio(pos, 110)).toBeCloseTo(0.1, 12)
  })

  it('finds a position by slot', () => {
    const pos = { slotIndex: 3, quantity: 1, avgPrice: 1, openedOnDay: 1 }
    const run = { positions: [pos] } as never
    expect(positionOf(run, 3)).toBe(pos)
    expect(positionOf(run, 4)).toBeUndefined()
  })
})