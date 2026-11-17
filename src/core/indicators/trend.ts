// Trend indicators drawn on the main chart: moving averages and Bollinger Bands.

import { colorOf, INDICATOR_PARAMS } from '../../config/indicators'
import type { Candle } from '../types'
import { sma } from './ma'
import type { IndicatorBody, Series } from './types'

export function maResult(id: string, period: number, candles: Candle[]): IndicatorBody {
  const closes = candles.map((c) => c.close)
  return { placement: 'overlay', lines: [{ key: id, values: sma(closes, period), color: colorOf(id) }] }
}

export function bollinger(closes: number[], period: number, mult: number) {
  const mid = sma(closes, period)
  const upper: Series = new Array(closes.length).fill(null)
  const lower: Series = new Array(closes.length).fill(null)
  for (let i = 0; i < closes.length; i++) {
    const m = mid[i]
    if (m === null) continue
    let variance = 0
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - m) ** 2
    const std = Math.sqrt(variance / period)
    upper[i] = m + mult * std
    lower[i] = m - mult * std
  }
  return { mid, upper, lower }
}

export function bollResult(candles: Candle[]): IndicatorBody {
  const { period, mult } = INDICATOR_PARAMS.boll
  const { mid, upper, lower } = bollinger(candles.map((c) => c.close), period, mult)
  return {
    placement: 'overlay',
    lines: [
      { key: 'bollUpper', values: upper, color: colorOf('bollUpper') },
      { key: 'bollMid', values: mid, color: colorOf('bollMid') },
      { key: 'bollLower', values: lower, color: colorOf('bollLower') },
    ],
  }
}