// Support / resistance from swing points. Recomputed from history every time, so nothing is stored.
// Steps: find swing points -> cluster nearby prices -> keep clusters with enough touches
// -> drop lines broken by consecutive closes -> drop newer lines inside older ones
// -> keep only lines inside the visible price range.

import { GAME } from '../../config/game'
import { INDICATOR_PARAMS } from '../../config/indicators'
import type { Candle } from '../types'
import type { IndicatorLevel, IndicatorBody } from './types'

type Kind = 'support' | 'resistance'

interface Level {
  price: number // average of the touches
  low: number // price band of the touches
  high: number
  first: number // candle index of the earliest touch
  last: number // candle index of the latest touch
}

const P = INDICATOR_PARAMS.levels

// Local highs (or lows): strictly beyond all candles within `side` on both sides
function swings(candles: Candle[], start: number, kind: Kind): { index: number; price: number }[] {
  const out: { index: number; price: number }[] = []
  const pick = (c: Candle) => (kind === 'resistance' ? c.high : c.low)
  for (let i = start + P.swingSide; i <= candles.length - 1 - P.swingSide; i++) {
    const p = pick(candles[i])
    let ok = true
    for (let j = i - P.swingSide; j <= i + P.swingSide; j++) {
      if (j === i) continue
      const q = pick(candles[j])
      if (kind === 'resistance' ? q >= p : q <= p) {
        ok = false
        break
      }
    }
    if (ok) out.push({ index: i, price: p })
  }
  return out
}

// Group points whose prices are within clusterPct of the group's lowest price
function cluster(points: { index: number; price: number }[]): Level[] {
  const sorted = [...points].sort((a, b) => a.price - b.price)
  const groups: { index: number; price: number }[][] = []
  for (const p of sorted) {
    const group = groups[groups.length - 1]
    if (group && p.price <= group[0].price * (1 + P.clusterPct)) group.push(p)
    else groups.push([p])
  }
  return groups
    .filter((g) => g.length >= P.minTouches)
    .map((g) => {
      const prices = g.map((p) => p.price)
      const indexes = g.map((p) => p.index)
      return {
        price: prices.reduce((a, b) => a + b, 0) / prices.length,
        low: Math.min(...prices),
        high: Math.max(...prices),
        first: Math.min(...indexes),
        last: Math.max(...indexes),
      }
    })
}

// Broken: after the last touch, closes stay beyond the line for breakDays in a row
function isBroken(candles: Candle[], level: Level, kind: Kind): boolean {
  let run = 0
  for (let i = level.last + 1; i < candles.length; i++) {
    const close = candles[i].close
    const beyond = kind === 'resistance' ? close > level.price : close < level.price
    run = beyond ? run + 1 : 0
    if (run >= P.breakDays) return true
  }
  return false
}

// A newer line inside an older line's price band is not shown
function dropNested(levels: Level[]): Level[] {
  const kept: Level[] = []
  for (const l of [...levels].sort((a, b) => a.first - b.first)) {
    const nested = kept.some(
      (k) => l.price >= k.low * (1 - P.clusterPct) && l.price <= k.high * (1 + P.clusterPct),
    )
    if (!nested) kept.push(l)
  }
  return kept
}

export function computeLevels(candles: Candle[], count: number = GAME.visibleBars): IndicatorLevel[] {
  const start = Math.max(0, candles.length - P.lookback)
  const visible = candles.slice(-count)
  if (visible.length === 0) return []
  const min = Math.min(...visible.map((c) => c.low))
  const max = Math.max(...visible.map((c) => c.high))

  const result: IndicatorLevel[] = []
  for (const kind of ['resistance', 'support'] as const) {
    const lines = cluster(swings(candles, start, kind)).filter((l) => !isBroken(candles, l, kind))
    for (const l of dropNested(lines)) {
      if (l.price >= min && l.price <= max) result.push({ price: l.price, kind })
    }
  }
  return result
}

export function levelsResult(candles: Candle[], count?: number): IndicatorBody {
  return { placement: 'overlay', lines: [], levels: computeLevels(candles, count) }
}