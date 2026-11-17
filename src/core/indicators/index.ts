// One entry point for every talent id. Uses candles[0..cursor] only, so it can never see the future.

import { MA_PERIODS } from '../../config/indicators'
import type { Candle } from '../types'
import { levelsResult } from './levels'
import { kdjResult, macdResult, rsi14Result, rsiPairResult } from './momentum'
import { atrResult } from './risk'
import { bollResult, maResult } from './trend'
import type { IndicatorBody, IndicatorResult } from './types'
import { obvResult, volMaResult, volResult } from './volume'

export type { IndicatorLevel, IndicatorLine, IndicatorResult, Series } from './types'

function body(id: string, data: Candle[], count?: number): IndicatorBody | undefined {
  if (id in MA_PERIODS) return maResult(id, MA_PERIODS[id], data)
  switch (id) {
    case 'boll':
      return bollResult(data)
    case 'rsi14':
      return rsi14Result(data)
    case 'rsi7_21':
      return rsiPairResult(data)
    case 'macd':
      return macdResult(data)
    case 'kdj':
      return kdjResult(data)
    case 'vol':
      return volResult(data)
    case 'volMa':
      return volMaResult(data)
    case 'atr':
      return atrResult(data)
    case 'obv':
      return obvResult(data)
    case 'supportResistance':
      return levelsResult(data, count)
    default:
      return undefined
  }
}

export function computeIndicator(
  id: string,
  candles: Candle[],
  cursor: number,
  count?: number,
): IndicatorResult | undefined {
  const result = body(id, candles.slice(0, cursor + 1), count)
  return result ? { id, ...result } : undefined
}

export interface ChartLayers {
  overlays: IndicatorResult[] // drawn on the main chart
  subs: IndicatorResult[] // one sub chart each, in equip order, at most maxSubs
}

// Split the equipped talents into main-chart overlays and sub charts.
export function buildChartLayers(
  equipped: string[],
  candles: Candle[],
  cursor: number,
  maxSubs = 3,
  count?: number,
): ChartLayers {
  const all = equipped
    .map((id) => computeIndicator(id, candles, cursor, count))
    .filter((r): r is IndicatorResult => r !== undefined)
  return {
    overlays: all.filter((r) => r.placement === 'overlay'),
    subs: all.filter((r) => r.placement === 'sub').slice(0, maxSubs),
  }
}