// Derived statistics. Pure functions. Missing data is undefined (the UI shows "-").

import { GAME } from '../config/game'
import { calcAssets } from './assets'
import type { RunState } from './types'

export interface DerivedStats {
  assets: number
  returnRate: number // 0.2 = +20% vs starting cash
  winRate?: number // wins / (wins + losses); break-even sells are not counted
  avgWin?: number
  avgLoss?: number // positive number
  profitFactor?: number // avgWin / avgLoss
  avgHoldingDays?: number
}

function divide(a: number, b: number): number | undefined {
  return b > 0 ? a / b : undefined
}

export function deriveStats(run: RunState): DerivedStats {
  const s = run.stats
  const assets = calcAssets(run)
  const avgWin = divide(s.totalWinAmount, s.winCount)
  const avgLoss = divide(s.totalLossAmount, s.lossCount)

  return {
    assets,
    returnRate: assets / GAME.startingCash - 1,
    winRate: divide(s.winCount, s.winCount + s.lossCount),
    avgWin,
    avgLoss,
    profitFactor: avgWin !== undefined && avgLoss !== undefined && avgLoss > 0 ? avgWin / avgLoss : undefined,
    avgHoldingDays: divide(s.totalHoldingDays, s.closedPositionCount),
  }
}