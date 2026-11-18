import { describe, expect, it } from 'vitest'
import { GAME } from '../config/game'
import { INDUSTRIES } from '../config/market'
import { createRng } from '../core/rng'
import { pickSeries } from '../core/sampling'
import { getDataVersion, getPoolSize, listStockIds } from './history'
import rawData from './stocks.json'

describe('stocks.json', () => {
  it('has a usable pool with unique, anonymous ids', () => {
    const ids = listStockIds()
    expect(getPoolSize()).toBeGreaterThanOrEqual(40)
    expect(getDataVersion()).toBeGreaterThanOrEqual(2)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^S\d{4}$/.test(id))).toBe(true)
  })

  it('does not contain tickers, names or dates', () => {
    expect(JSON.stringify(rawData)).not.toMatch(/"(ticker|date|name|symbol)"/i)
  })
})

describe('sampled segments', () => {
  const rng = createRng(2024)
  const samples = Array.from({ length: 500 }, () => pickSeries(rng, new Set()))

  it('have valid candles', () => {
    for (const s of samples) {
      expect(s.candles).toHaveLength(GAME.seriesLength)
      for (const c of s.candles) {
        expect(c.low).toBeGreaterThan(0)
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close))
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close))
      }
    }
  })

  it('use known industries', () => {
    const known = new Set<string>(INDUSTRIES)
    expect(samples.every((s) => known.has(s.industry))).toBe(true)
  })

  it('contain no split-like jumps (a missed split would show as an exact 1/2, 1/3, 1/4, 1/5 or 1/10 move)', () => {
    let found = 0
    for (const s of samples) {
      for (let i = 1; i < s.candles.length; i++) {
        const ratio = s.candles[i - 1].close / s.candles[i].close
        for (const k of [2, 3, 4, 5, 10]) {
          if (Math.abs(ratio - k) / k < 0.02 || Math.abs(1 / ratio - k) / k < 0.02) found += 1
        }
      }
    }
    expect(found).toBe(0)
  })
})