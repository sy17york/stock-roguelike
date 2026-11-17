// ATR: average true range (Wilder smoothing), a measure of how much the stock swings.

import { colorOf, INDICATOR_PARAMS } from '../../config/indicators'
import type { Candle } from '../types'
import type { IndicatorBody, Series } from './types'

export function atr(candles: Candle[], period: number): Series {
  const n = candles.length
  const out: Series = new Array(n).fill(null)
  if (n < period) return out

  const tr = candles.map((c, i) =>
    i === 0
      ? c.high - c.low
      : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close)),
  )

  let value = 0
  for (let i = 0; i < period; i++) value += tr[i]
  value /= period
  out[period - 1] = value
  for (let i = period; i < n; i++) {
    value = (value * (period - 1) + tr[i]) / period
    out[i] = value
  }
  return out
}

export function atrResult(candles: Candle[]): IndicatorBody {
  return {
    placement: 'sub',
    lines: [{ key: 'atr', values: atr(candles, INDICATOR_PARAMS.atr.period), color: colorOf('atr') }],
  }
}