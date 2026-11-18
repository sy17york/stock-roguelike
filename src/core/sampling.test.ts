import { describe, expect, it } from 'vitest'
import { GAME } from '../config/game'
import { MARKET } from '../config/market'
import { getHistory } from '../data/history'
import { createRng } from './rng'
import { getSeriesAt, pickSeries, targetStartPrice } from './sampling'

describe('start price', () => {
  it('is deterministic and inside the target range', () => {
    expect(targetStartPrice('S0001', 100)).toBe(targetStartPrice('S0001', 100))
    for (let i = 0; i < 200; i++) {
      const p = targetStartPrice(`S${i}`, i * 7)
      expect(p).toBeGreaterThanOrEqual(MARKET.minStartPrice)
      expect(p).toBeLessThanOrEqual(MARKET.maxStartPrice)
    }
  })
})

describe('pickSeries', () => {
  it('returns a full segment whose first visible close is the target price', () => {
    const s = pickSeries(createRng(1), new Set())
    expect(s.candles).toHaveLength(GAME.seriesLength)
    expect(s.candles[GAME.warmupBars].close).toBe(targetStartPrice(s.stockId, s.startIndex))
  })

  it('keeps the shape of the real history (same percentage moves)', () => {
    const s = pickSeries(createRng(2), new Set())
    const raw = getHistory(s.stockId)!.candles
    const i = s.startIndex
    const rawMove = raw[i + 250].close / raw[i + GAME.warmupBars].close
    const move = s.candles[250].close / s.candles[GAME.warmupBars].close
    expect(Math.abs(move / rawMove - 1)).toBeLessThan(0.01)
  })

  it('never returns an excluded stock', () => {
    const rng = createRng(3)
    const banned = new Set([pickSeries(rng, new Set()).stockId])
    for (let i = 0; i < 200; i++) {
      expect(banned.has(pickSeries(rng, banned).stockId)).toBe(false)
    }
  })

  it('is reproducible from a seed, and varies between draws', () => {
    const a = pickSeries(createRng(7), new Set())
    const b = pickSeries(createRng(7), new Set())
    expect(a).toEqual(b)

    const rng = createRng(8)
    const starts = new Set(Array.from({ length: 50 }, () => pickSeries(rng, new Set()).startIndex))
    expect(starts.size).toBeGreaterThan(20)
  })
})

describe('getSeriesAt (loading a save)', () => {
  it('rebuilds exactly the same series from stockId and startIndex', () => {
    const a = pickSeries(createRng(5), new Set())
    expect(getSeriesAt(a.stockId, a.startIndex)).toEqual(a)
  })

  it('rejects unknown ids and bad ranges', () => {
    const a = pickSeries(createRng(5), new Set())
    expect(getSeriesAt('S9999', 0)).toBeUndefined()
    expect(getSeriesAt(a.stockId, -1)).toBeUndefined()
    expect(getSeriesAt(a.stockId, 1.5)).toBeUndefined()
    expect(getSeriesAt(a.stockId, 999_999)).toBeUndefined()
  })
})