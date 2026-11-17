// Data access layer: the ONLY file that knows where stock data comes from.
// Everything else asks for histories by stockId.
// Today it reads one JSON file synchronously. Later it can be replaced by
// per-stock files, chunks or an index table; keep these exports stable.
// Rule for the data file: only append stocks, never change or delete a stockId.

import { GAME } from '../config/game'
import { INDUSTRIES } from '../config/market'
import type { IndustryId } from '../config/market'
import type { Candle } from '../core/types'
import rawData from './stocks.json'

// File format: candles are [open, high, low, close, volume] arrays to save space.
interface RawStock {
  stockId: string
  industry: string
  candles: number[][]
}

interface StockFile {
  version: number // file format version
  dataVersion: number // bump only on a breaking data change
  stocks: RawStock[]
}

export interface StockHistory {
  stockId: string
  industry: IndustryId
  candles: Candle[] // full history, oldest first
}

const file = rawData as StockFile
const industrySet = new Set<string>(INDUSTRIES)

const usable: RawStock[] = file.stocks.filter(
  (s) =>
    typeof s.stockId === 'string' &&
    industrySet.has(s.industry) &&
    s.candles.length >= GAME.seriesLength,
)
const rawById = new Map<string, RawStock>(usable.map((s) => [s.stockId, s]))
const cache = new Map<string, StockHistory>()

export function getDataVersion(): number {
  return file.dataVersion
}

export function listStockIds(): string[] {
  return usable.map((s) => s.stockId)
}

export function getPoolSize(): number {
  return usable.length
}

// Full history of one stock, or undefined if the id is unknown.
export function getHistory(stockId: string): StockHistory | undefined {
  const cached = cache.get(stockId)
  if (cached) return cached

  const raw = rawById.get(stockId)
  if (!raw) return undefined

  const history: StockHistory = {
    stockId: raw.stockId,
    industry: raw.industry as IndustryId,
    candles: raw.candles.map(([open, high, low, close, volume]) => ({
      open,
      high,
      low,
      close,
      volume,
    })),
  }
  cache.set(stockId, history)
  return history
}