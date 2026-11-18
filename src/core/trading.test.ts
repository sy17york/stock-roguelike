import { describe, expect, it } from 'vitest'
import { at, runWithSlot } from '../test/helpers'
import {
  applyBuy,
  applySell,
  calcFee,
  maxAffordableQuantity,
  previewBuy,
  previewSell,
  round2,
} from './trading'
import type { TradeResult } from './trading'
import type { RunState } from './types'

function okRun(result: TradeResult): RunState {
  if (!result.ok) throw new Error(`trade failed: ${result.reason}`)
  return result.run
}

describe('rounding and fees', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(8098.1000000001)).toBe(8098.1)
  })

  it('charges 0.1% rounded to cents', () => {
    expect(calcFee(1000)).toBe(1)
    expect(calcFee(523)).toBe(0.52)
  })
})

describe('previews', () => {
  it('previews a buy', () => {
    expect(previewBuy(100, 10, 10_000)).toEqual({
      ok: true,
      amount: 1000,
      fee: 1,
      totalCost: 1001,
      cashAfter: 8999,
    })
  })

  it('rejects bad quantities and missing cash', () => {
    for (const q of [0, -1, 1.5, NaN]) {
      expect(previewBuy(100, q, 10_000)).toEqual({ ok: false, reason: 'invalidQuantity' })
    }
    expect(previewBuy(100, 100, 10_000)).toEqual({ ok: false, reason: 'insufficientCash' })
  })

  it('previews a sell with realized profit after fee', () => {
    const position = { slotIndex: 0, quantity: 20, avgPrice: 95, openedOnDay: 1 }
    expect(previewSell(position, 110, 20)).toEqual({
      ok: true,
      amount: 2200,
      fee: 2.2,
      netProceeds: 2197.8,
      realizedPnl: 297.8,
      closesPosition: true,
    })
  })

  it('rejects sells without a position or beyond the position', () => {
    const position = { slotIndex: 0, quantity: 5, avgPrice: 95, openedOnDay: 1 }
    expect(previewSell(undefined, 100, 1)).toEqual({ ok: false, reason: 'noPosition' })
    expect(previewSell(position, 100, 6)).toEqual({ ok: false, reason: 'insufficientShares' })
    expect(previewSell(position, 100, 0)).toEqual({ ok: false, reason: 'invalidQuantity' })
  })
})

describe('maxAffordableQuantity', () => {
  it('includes the fee', () => {
    expect(maxAffordableQuantity(100, 1000)).toBe(9) // 10 shares would cost 1001
    expect(maxAffordableQuantity(100, 1001)).toBe(10)
  })

  it('is 0 when nothing is affordable', () => {
    expect(maxAffordableQuantity(100, 0)).toBe(0)
    expect(maxAffordableQuantity(0, 1000)).toBe(0)
    expect(maxAffordableQuantity(100, 50)).toBe(0)
  })
})

describe('buying and selling', () => {
  it('merges buys by weighted average and tracks the whole round trip', () => {
    const run0 = runWithSlot(100)
    const r1 = okRun(applyBuy(run0, 0, 10))
    expect(r1.cash).toBe(8999)
    expect(r1.stats.peakCash).toBe(10_000) // buying never raises peak cash

    const r2 = okRun(applyBuy(at(r1, 90), 0, 10))
    expect(r2.cash).toBe(8098.1)
    expect(r2.positions).toEqual([{ slotIndex: 0, quantity: 20, avgPrice: 95, openedOnDay: 1 }])

    const r3 = okRun(applySell(at(r2, 110, 4), 0, 20))
    expect(r3.cash).toBe(10_295.9)
    expect(r3.positions).toHaveLength(0)
    expect(r3.stats).toMatchObject({
      buyCount: 2,
      sellCount: 1,
      winCount: 1,
      lossCount: 0,
      totalWinAmount: 297.8,
      maxSingleWin: 297.8,
      currentStreak: 1,
      peakCash: 10_295.9,
      closedPositionCount: 1,
      totalHoldingDays: 3,
      totalFees: 4.1,
    })
  })

  it('does not change the run it was given', () => {
    const run0 = runWithSlot(100)
    applyBuy(run0, 0, 10)
    expect(run0.cash).toBe(10_000)
    expect(run0.positions).toHaveLength(0)
  })

  it('a partial sell keeps the average price and counts no holding days', () => {
    const r1 = okRun(applyBuy(runWithSlot(100), 0, 10))
    const r2 = okRun(applySell(at(r1, 110, 2), 0, 4))
    expect(r2.positions).toEqual([{ slotIndex: 0, quantity: 6, avgPrice: 100, openedOnDay: 1 }])
    expect(r2.stats.sellCount).toBe(1)
    expect(r2.stats.closedPositionCount).toBe(0)
    expect(r2.stats.totalHoldingDays).toBe(0)
  })

  it('records a loss', () => {
    const r1 = okRun(applyBuy(runWithSlot(100), 0, 10))
    const r2 = okRun(applySell(at(r1, 90), 0, 10))
    expect(r2.cash).toBe(9898.1)
    expect(r2.stats).toMatchObject({
      winCount: 0,
      lossCount: 1,
      totalLossAmount: 100.9,
      maxSingleLoss: 100.9,
      currentStreak: -1,
      peakCash: 10_000,
    })
  })

  it('tracks win and loss streaks', () => {
    let run = okRun(applyBuy(runWithSlot(100), 0, 10))
    for (const price of [110, 110, 90, 90, 90, 110]) {
      run = okRun(applySell(at(run, price), 0, 1))
    }
    expect(run.stats.maxWinStreak).toBe(2)
    expect(run.stats.maxLossStreak).toBe(3)
    expect(run.stats.currentStreak).toBe(1)
  })

  it('returns reason codes instead of throwing', () => {
    const run0 = runWithSlot(100)
    expect(applyBuy(run0, 5, 1)).toEqual({ ok: false, reason: 'invalidSlot' })
    expect(applySell(run0, 5, 1)).toEqual({ ok: false, reason: 'invalidSlot' })
    expect(applySell(run0, 0, 1)).toEqual({ ok: false, reason: 'noPosition' })
    expect(applyBuy(run0, 0, 999)).toEqual({ ok: false, reason: 'insufficientCash' })
    expect(applyBuy(run0, 0, 0)).toEqual({ ok: false, reason: 'invalidQuantity' })
    const held = okRun(applyBuy(run0, 0, 2))
    expect(applySell(held, 0, 3)).toEqual({ ok: false, reason: 'insufficientShares' })
  })
})