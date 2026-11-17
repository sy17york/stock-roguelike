// Random drawing of stock series. Reads data only through data/history.ts.
// Prices are rescaled per segment (plan C): the close on the first visible day is moved to a
// price between MARKET.minStartPrice and MARKET.maxStartPrice, and every other price in the
// segment is multiplied by the same factor. Shape and percentage moves are untouched.

import { GAME } from '../config/game'
import { MARKET } from '../config/market'
import { getHistory, listStockIds } from '../data/history'
import type { StockHistory } from '../data/history'
import { randInt } from './rng'
import type { Rng } from './rng'
import type { Candle, StockSeries } from './types'

// Deterministic number in [0, 1) from a string (FNV-1a plus a final bit mix).
function hashUnit(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

// Where this segment's first visible close lands. Log-uniform, so cheap and expensive
// prices are equally likely. Same inputs always give the same price.
export function targetStartPrice(stockId: string, startIndex: number): number {
  const u = hashUnit(`${MARKET.priceSalt}|${stockId}|${startIndex}`)
  const lo = Math.log(MARKET.minStartPrice)
  const hi = Math.log(MARKET.maxStartPrice)
  return round2(Math.exp(lo + u * (hi - lo)))
}

function buildSeries(history: StockHistory, startIndex: number): StockSeries {
  const raw = history.candles.slice(startIndex, startIndex + GAME.seriesLength)
  const scale = targetStartPrice(history.stockId, startIndex) / raw[GAME.warmupBars].close

  // Rounding is monotonic, so low <= open/close <= high still holds. 0.01 is the floor.
  const px = (v: number) => Math.max(0.01, round2(v * scale))
  const candles: Candle[] = raw.map((c) => ({
    open: px(c.open),
    high: px(c.high),
    low: px(c.low),
    close: px(c.close),
    volume: c.volume,
  }))

  return { stockId: history.stockId, industry: history.industry, startIndex, candles }
}

// Re-cut a series from a save. Returns undefined if the id or range is invalid.
export function getSeriesAt(stockId: string, startIndex: number): StockSeries | undefined {
  const history = getHistory(stockId)
  if (!history) return undefined
  if (!Number.isInteger(startIndex) || startIndex < 0) return undefined
  if (startIndex + GAME.seriesLength > history.candles.length) return undefined
  return buildSeries(history, startIndex)
}

// Draw a random stock and a random period, skipping excluded stockIds.
export function pickSeries(rng: Rng, excludeStockIds: Set<string>): StockSeries {
  const ids = listStockIds()
  if (ids.length === 0) throw new Error('No stocks in the data file')

  for (let attempt = 0; attempt < 500; attempt++) {
    const stockId = ids[randInt(rng, ids.length)]
    if (excludeStockIds.has(stockId)) continue

    const history = getHistory(stockId)
    if (!history) continue
    const maxStart = history.candles.length - GAME.seriesLength
    if (maxStart < 0) continue

    return buildSeries(history, randInt(rng, maxStart + 1))
  }
  throw new Error('Could not draw a series that satisfies the rules')
}