import { describe, expect, it } from 'vitest'
import { GAME } from '../../config/game'
import { TALENT_IDS } from '../../config/talents'
import { sliceVisible } from '../chart'
import { createRng } from '../rng'
import type { Candle } from '../types'
import { buildChartLayers, computeIndicator } from './index'
import { ema, sma } from './ma'
import { kdj, macd, rsi } from './momentum'
import { atr } from './risk'
import { bollinger } from './trend'
import { obv } from './volume'

function randomCandles(n: number, seed: number): Candle[] {
  const rng = createRng(seed)
  let p = 100
  return Array.from({ length: n }, () => {
    const open = p
    const close = p * (1 + (rng.next() - 0.5) * 0.04)
    p = close
    return {
      open,
      high: Math.max(open, close) * (1 + rng.next() * 0.01),
      low: Math.min(open, close) * (1 - rng.next() * 0.01),
      close,
      volume: 50 + rng.next() * 100,
    }
  })
}

const flatCandle: Candle = { open: 10, high: 10, low: 10, close: 10, volume: 1 }

describe('averages', () => {
  it('sma and ema', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
    expect(ema([null, null, 1, 2, 3, 4, 5], 3)).toEqual([null, null, null, null, 2, 3, 4])
  })
})

describe('momentum', () => {
  it('rsi: hand values and extremes', () => {
    expect(rsi([1, 2, 1, 2], 2)).toEqual([null, null, 50, 75])
    expect(rsi(Array.from({ length: 20 }, (_, i) => i + 1), 14)[19]).toBeCloseTo(100, 9)
    expect(rsi(Array.from({ length: 20 }, (_, i) => 20 - i), 14)[19]).toBeCloseTo(0, 9)
    expect(rsi(new Array(20).fill(5), 14)[19]).toBeCloseTo(50, 9)
    expect(rsi([1, 2, 3], 14).every((v) => v === null)).toBe(true)
  })

  it('macd: start positions and histogram', () => {
    const closes = randomCandles(100, 5).map((c) => c.close)
    const m = macd(closes)
    expect(m.line[24]).toBeNull()
    expect(m.line[25]).not.toBeNull()
    expect(m.signal[32]).toBeNull()
    expect(m.signal[33]).not.toBeNull()
    expect(m.hist[99]).toBeCloseTo((m.line[99] as number) - (m.signal[99] as number), 9)
  })

  it('kdj: constant prices read 50', () => {
    const k = kdj(new Array(30).fill(flatCandle), 9, 3)
    expect(k.k[7]).toBeNull()
    expect(k.k[29]).toBeCloseTo(50, 9)
    expect(k.d[29]).toBeCloseTo(50, 9)
    expect(k.j[29]).toBeCloseTo(50, 9)
  })
})

describe('trend, risk and volume', () => {
  it('bollinger bands', () => {
    const b = bollinger([1, 2, 3], 3, 2)
    expect(b.mid[2]).toBeCloseTo(2, 9)
    expect(b.upper[2]).toBeCloseTo(2 + 2 * Math.sqrt(2 / 3), 9)
    const flat = bollinger(new Array(30).fill(100), 20, 2)
    expect(flat.upper[29]).toBeCloseTo(100, 9)
    expect(flat.lower[29]).toBeCloseTo(100, 9)
  })

  it('atr by hand', () => {
    const candles: Candle[] = [
      { open: 9, high: 10, low: 8, close: 9, volume: 1 },
      { open: 9, high: 11, low: 9, close: 10, volume: 1 },
      { open: 10, high: 13, low: 10, close: 12, volume: 1 },
    ]
    expect(atr(candles, 2)).toEqual([null, 2, 2.5])
  })

  it('obv by hand', () => {
    const candles = [10, 11, 10, 10, 12].map((close, i) => ({ ...flatCandle, close, volume: [5, 3, 2, 4, 7][i] }))
    expect(obv(candles)).toEqual([0, 3, 1, 1, 8])
  })
})

describe('support and resistance', () => {
  function flat(
    n: number,
    highs: Record<number, number> = {},
    lows: Record<number, number> = {},
    closes: Record<number, number> = {},
  ): Candle[] {
    return Array.from({ length: n }, (_, i) => {
      const close = closes[i] ?? 100
      return {
        open: close,
        high: Math.max(highs[i] ?? 101, close),
        low: Math.min(lows[i] ?? 99, close),
        close,
        volume: 100,
      }
    })
  }
  const levels = (c: Candle[]) => computeIndicator('supportResistance', c, c.length - 1)?.levels ?? []
  const A = { 10: 110, 20: 110.5, 30: 109.8 }

  it('three touches make a line, two do not', () => {
    const one = levels(flat(45, A))
    expect(one).toHaveLength(1)
    expect(one[0].kind).toBe('resistance')
    expect(one[0].price).toBeCloseTo(110.1, 9)
    expect(levels(flat(45, { 10: 110, 20: 110.5 }))).toHaveLength(0)
  })

  it('finds supports', () => {
    const s = levels(flat(45, {}, { 10: 90, 20: 89.5, 30: 90.2 }))
    expect(s).toHaveLength(1)
    expect(s[0].kind).toBe('support')
  })

  it('removes a line after 3 closes beyond it, keeps it after 2', () => {
    expect(levels(flat(45, A, {}, { 40: 111, 41: 111, 42: 111 }))).toHaveLength(0)
    expect(levels(flat(45, A, {}, { 40: 111, 41: 111 }))).toHaveLength(1)
  })

  it('hides a newer line nested inside an older band, shows far apart lines', () => {
    const nested = levels(flat(45, { ...A, 14: 111.6, 24: 111.8, 34: 111.7 }))
    expect(nested).toHaveLength(1)
    expect(nested[0].price).toBeCloseTo(110.1, 9)
    expect(levels(flat(45, { ...A, 14: 120, 24: 120, 34: 120 }))).toHaveLength(2)
  })
})

describe('every talent', () => {
  const data = randomCandles(380, 9)
  const cursor = GAME.initialCursor

  it('has an indicator whose series match the candle count', () => {
    for (const id of TALENT_IDS) {
      const r = computeIndicator(id, data, cursor)
      expect(r?.id).toBe(id)
      expect(r!.lines.every((l) => l.values.length === cursor + 1)).toBe(true)
    }
    expect(computeIndicator('nope', data, cursor)).toBeUndefined()
  })

  it('never looks at candles after the cursor', () => {
    const future = data.map((c, i) =>
      i > cursor ? { ...c, high: c.high * 3, low: c.low / 3, close: c.close * 2, volume: c.volume * 5 } : c,
    )
    for (const id of TALENT_IDS) {
      expect(computeIndicator(id, future, cursor)).toEqual(computeIndicator(id, data, cursor))
    }
  })
})

describe('chart layers', () => {
  const data = randomCandles(380, 4)
  const cursor = GAME.initialCursor

  it('splits overlays from sub charts in equip order, at most 3 subs', () => {
    expect(buildChartLayers([], data, cursor)).toEqual({ overlays: [], subs: [] })

    const mixed = buildChartLayers(['rsi14', 'ma20', 'vol'], data, cursor)
    expect(mixed.overlays.map((r) => r.id)).toEqual(['ma20'])
    expect(mixed.subs.map((r) => r.id)).toEqual(['rsi14', 'vol'])

    const four = buildChartLayers(['rsi14', 'macd', 'kdj', 'atr'], data, cursor)
    expect(four.subs.map((r) => r.id)).toEqual(['rsi14', 'macd', 'kdj'])
    expect(buildChartLayers(['zzz', 'ma5'], data, cursor).overlays).toHaveLength(1)
  })

  it('volume is a sub chart drawn as volume bars', () => {
    const vol = computeIndicator('vol', data, cursor)!
    expect(vol.placement).toBe('sub')
    expect(vol.lines[0].style).toBe('volume')
    const ma = computeIndicator('ma5', data, cursor)!
    expect(sliceVisible(ma.lines[0].values)).toHaveLength(GAME.visibleBars)
  })
})