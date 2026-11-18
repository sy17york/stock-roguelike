import { describe, expect, it } from 'vitest'
import { createNewRun } from '../state/newRun'
import { deriveStats } from './stats'

const base = createNewRun(31)

describe('deriveStats', () => {
  it('has no averages or ratios before the first sell', () => {
    const d = deriveStats(base)
    expect(d.assets).toBe(10_000)
    expect(d.returnRate).toBe(0)
    expect(d.winRate).toBeUndefined()
    expect(d.avgWin).toBeUndefined()
    expect(d.avgLoss).toBeUndefined()
    expect(d.profitFactor).toBeUndefined()
    expect(d.avgHoldingDays).toBeUndefined()
  })

  it('derives rates from the accumulated numbers', () => {
    const run = {
      ...base,
      cash: 12_000,
      stats: {
        ...base.stats,
        winCount: 3,
        lossCount: 2,
        totalWinAmount: 600,
        totalLossAmount: 200,
        closedPositionCount: 4,
        totalHoldingDays: 10,
      },
    }
    const d = deriveStats(run)
    expect(d.returnRate).toBeCloseTo(0.2, 9)
    expect(d.winRate).toBeCloseTo(0.6, 9)
    expect(d.avgWin).toBe(200)
    expect(d.avgLoss).toBe(100)
    expect(d.profitFactor).toBe(2)
    expect(d.avgHoldingDays).toBe(2.5)
  })

  it('has no profit factor when there are no losses', () => {
    const d = deriveStats({
      ...base,
      stats: { ...base.stats, winCount: 2, totalWinAmount: 100 },
    })
    expect(d.winRate).toBe(1)
    expect(d.profitFactor).toBeUndefined()
  })

  it('counts held stocks in total assets', () => {
    const held = {
      ...base,
      cash: 9_000,
      positions: [{ slotIndex: 0, quantity: 10, avgPrice: 1, openedOnDay: 1 }],
    }
    expect(deriveStats(held).assets).toBeGreaterThan(9_000)
  })
})