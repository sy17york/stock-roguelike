// Oscillators shown in sub charts: RSI, MACD, KDJ.

import { colorOf, INDICATOR_PARAMS } from '../../config/indicators'
import type { Candle } from '../types'
import { ema } from './ma'
import type { IndicatorBody, Series } from './types'

// ---------- RSI (Wilder smoothing) ----------

function rsiValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100 // flat prices read as neutral
  return 100 - 100 / (1 + avgGain / avgLoss)
}

export function rsi(closes: number[], period: number): Series {
  const out: Series = new Array(closes.length).fill(null)
  if (closes.length <= period) return out

  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) avgGain += d
    else avgLoss -= d
  }
  avgGain /= period
  avgLoss /= period
  out[period] = rsiValue(avgGain, avgLoss)

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period
    out[i] = rsiValue(avgGain, avgLoss)
  }
  return out
}

const rsiGuides = [INDICATOR_PARAMS.rsi.upper, INDICATOR_PARAMS.rsi.lower]

export function rsi14Result(candles: Candle[]): IndicatorBody {
  const closes = candles.map((c) => c.close)
  return {
    placement: 'sub',
    lines: [{ key: 'rsi14', values: rsi(closes, INDICATOR_PARAMS.rsi.period), color: colorOf('rsi14') }],
    guides: rsiGuides,
  }
}

export function rsiPairResult(candles: Candle[]): IndicatorBody {
  const closes = candles.map((c) => c.close)
  return {
    placement: 'sub',
    lines: [
      { key: 'rsi7', values: rsi(closes, INDICATOR_PARAMS.rsi.fast), color: colorOf('rsi7') },
      { key: 'rsi21', values: rsi(closes, INDICATOR_PARAMS.rsi.slow), color: colorOf('rsi21') },
    ],
    guides: rsiGuides,
  }
}

// ---------- MACD ----------

export function macd(closes: number[]) {
  const { fast, slow, signal: signalPeriod } = INDICATOR_PARAMS.macd
  const fastEma = ema(closes, fast)
  const slowEma = ema(closes, slow)
  const line: Series = closes.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? (fastEma[i] as number) - (slowEma[i] as number) : null,
  )
  const signal = ema(line, signalPeriod)
  const hist: Series = line.map((v, i) => (v !== null && signal[i] !== null ? v - (signal[i] as number) : null))
  return { line, signal, hist }
}

export function macdResult(candles: Candle[]): IndicatorBody {
  const { line, signal, hist } = macd(candles.map((c) => c.close))
  return {
    placement: 'sub',
    lines: [
      { key: 'hist', values: hist, color: colorOf('hist'), style: 'bar' },
      { key: 'macd', values: line, color: colorOf('macd') },
      { key: 'signal', values: signal, color: colorOf('signal') },
    ],
    guides: [0],
  }
}

// ---------- KDJ ----------

export function kdj(candles: Candle[], period: number, smooth: number) {
  const n = candles.length
  const k: Series = new Array(n).fill(null)
  const d: Series = new Array(n).fill(null)
  const j: Series = new Array(n).fill(null)
  let prevK = 50
  let prevD = 50

  for (let i = period - 1; i < n; i++) {
    let hh = -Infinity
    let ll = Infinity
    for (let x = i - period + 1; x <= i; x++) {
      if (candles[x].high > hh) hh = candles[x].high
      if (candles[x].low < ll) ll = candles[x].low
    }
    const rsv = hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100
    prevK = ((smooth - 1) * prevK + rsv) / smooth
    prevD = ((smooth - 1) * prevD + prevK) / smooth
    k[i] = prevK
    d[i] = prevD
    j[i] = 3 * prevK - 2 * prevD
  }
  return { k, d, j }
}

export function kdjResult(candles: Candle[]): IndicatorBody {
  const { period, smooth, upper, lower } = INDICATOR_PARAMS.kdj
  const { k, d, j } = kdj(candles, period, smooth)
  return {
    placement: 'sub',
    lines: [
      { key: 'k', values: k, color: colorOf('k') },
      { key: 'd', values: d, color: colorOf('d') },
      { key: 'j', values: j, color: colorOf('j') },
    ],
    guides: [upper, lower],
  }
}