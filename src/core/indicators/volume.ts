// Volume-based indicators. Both are sub charts.

import { colorOf, INDICATOR_PARAMS } from '../../config/indicators'
import type { Candle } from '../types'
import { sma } from './ma'
import type { IndicatorBody } from './types'

// Volume bars; the chart colors each bar by the candle's direction.
export function volResult(candles: Candle[]): IndicatorBody {
  return {
    placement: 'sub',
    lines: [{ key: 'vol', values: candles.map((c) => c.volume), color: colorOf('vol'), style: 'volume' }],
  }
}

export function volMaResult(candles: Candle[]): IndicatorBody {
  const values = sma(candles.map((c) => c.volume), INDICATOR_PARAMS.volMa.period)
  return { placement: 'sub', lines: [{ key: 'volMa', values, color: colorOf('volMa') }] }
}

// On-balance volume: add the day's volume on up days, subtract it on down days.
// The number itself means nothing; only the shape matters.
export function obv(candles: Candle[]): number[] {
  const out: number[] = []
  let total = 0
  candles.forEach((c, i) => {
    if (i > 0) {
      const prev = candles[i - 1].close
      if (c.close > prev) total += c.volume
      else if (c.close < prev) total -= c.volume
    }
    out.push(total)
  })
  return out
}

export function obvResult(candles: Candle[]): IndicatorBody {
  const values = obv(candles)
  return {
    placement: 'sub',
    lines: [
      { key: 'obv', values, color: colorOf('obv') },
      { key: 'obvMa', values: sma(values, INDICATOR_PARAMS.obv.maPeriod), color: colorOf('obvMa') },
    ],
  }
}