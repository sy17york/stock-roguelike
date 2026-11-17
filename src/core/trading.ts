// Trading logic. Pure functions: input state in, new state out.
// No React, no display text. Errors are returned as reason codes;
// the UI maps each reason to a translated message.

import { TRADING } from '../config/trading'
import type { Position, RunState, Slot, Stats } from './types'

// ---------- Types ----------

export type TradeError =
  | 'invalidSlot'
  | 'invalidQuantity'
  | 'insufficientCash'
  | 'noPosition'
  | 'insufficientShares'

export type TradeResult =
  | { ok: true; run: RunState }
  | { ok: false; reason: TradeError }

export type BuyPreview =
  | {
      ok: true
      amount: number // price x quantity
      fee: number
      totalCost: number // amount + fee
      cashAfter: number
    }
  | { ok: false; reason: TradeError }

export type SellPreview =
  | {
      ok: true
      amount: number // price x quantity
      fee: number
      netProceeds: number // amount - fee
      realizedPnl: number // (price - avgPrice) x quantity - fee
      closesPosition: boolean
    }
  | { ok: false; reason: TradeError }

// ---------- Helpers ----------

// Round to 2 decimals. All money and prices go through this.
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calcFee(amount: number): number {
  return round2(amount * TRADING.feeRate)
}

function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= TRADING.minQuantity
}

// Today's price of a slot = close of the candle at the cursor
export function getPrice(slot: Slot): number {
  return slot.series.candles[slot.cursor].close
}

// Largest whole quantity the player can afford (including fee)
export function maxAffordableQuantity(price: number, cash: number): number {
  if (price <= 0 || cash <= 0) return 0
  let quantity = Math.floor(cash / (price * (1 + TRADING.feeRate)))
  // Rounding can make the estimate one share too high; step down until it fits
  while (quantity > 0) {
    const amount = round2(price * quantity)
    if (round2(amount + calcFee(amount)) <= cash) break
    quantity -= 1
  }
  return Math.max(quantity, 0)
}

// ---------- Previews (pure calculation, never stored) ----------

export function previewBuy(price: number, quantity: number, cash: number): BuyPreview {
  if (!isValidQuantity(quantity)) return { ok: false, reason: 'invalidQuantity' }

  const amount = round2(price * quantity)
  const fee = calcFee(amount)
  const totalCost = round2(amount + fee)

  if (totalCost > cash) return { ok: false, reason: 'insufficientCash' }

  return { ok: true, amount, fee, totalCost, cashAfter: round2(cash - totalCost) }
}

export function previewSell(
  position: Position | undefined,
  price: number,
  quantity: number,
): SellPreview {
  if (!position) return { ok: false, reason: 'noPosition' }
  if (!isValidQuantity(quantity)) return { ok: false, reason: 'invalidQuantity' }
  if (quantity > position.quantity) return { ok: false, reason: 'insufficientShares' }

  const amount = round2(price * quantity)
  const fee = calcFee(amount)
  const netProceeds = round2(amount - fee)
  const realizedPnl = round2((price - position.avgPrice) * quantity - fee)

  return {
    ok: true,
    amount,
    fee,
    netProceeds,
    realizedPnl,
    closesPosition: quantity === position.quantity,
  }
}

// ---------- Internal updaters ----------

function findPosition(run: RunState, slotIndex: number): Position | undefined {
  return run.positions.find((p) => p.slotIndex === slotIndex)
}

function statsAfterBuy(stats: Stats, fee: number): Stats {
  return {
    ...stats,
    buyCount: stats.buyCount + 1,
    totalFees: round2(stats.totalFees + fee),
  }
}

function statsAfterSell(
  stats: Stats,
  fee: number,
  realizedPnl: number,
  newCash: number,
  closedHoldingDays: number | null, // null = partial sell, not counted
): Stats {
  const next: Stats = {
    ...stats,
    sellCount: stats.sellCount + 1,
    totalFees: round2(stats.totalFees + fee),
    // Only cash after a sell can raise the peak (unrealized gains never count)
    peakCash: Math.max(stats.peakCash, newCash),
  }

  if (realizedPnl > 0) {
    next.winCount += 1
    next.totalWinAmount = round2(next.totalWinAmount + realizedPnl)
    next.maxSingleWin = Math.max(next.maxSingleWin, realizedPnl)
    next.currentStreak = next.currentStreak > 0 ? next.currentStreak + 1 : 1
    next.maxWinStreak = Math.max(next.maxWinStreak, next.currentStreak)
  } else if (realizedPnl < 0) {
    const loss = Math.abs(realizedPnl)
    next.lossCount += 1
    next.totalLossAmount = round2(next.totalLossAmount + loss)
    next.maxSingleLoss = Math.max(next.maxSingleLoss, loss)
    next.currentStreak = next.currentStreak < 0 ? next.currentStreak - 1 : -1
    next.maxLossStreak = Math.max(next.maxLossStreak, -next.currentStreak)
  }
  // realizedPnl === 0: not a win or loss, streak unchanged

  if (closedHoldingDays !== null) {
    next.closedPositionCount += 1
    next.totalHoldingDays += closedHoldingDays
  }

  return next
}

// ---------- Actions ----------

export function applyBuy(run: RunState, slotIndex: number, quantity: number): TradeResult {
  const slot = run.slots[slotIndex]
  if (!slot) return { ok: false, reason: 'invalidSlot' }

  const price = getPrice(slot)
  const preview = previewBuy(price, quantity, run.cash)
  if (!preview.ok) return { ok: false, reason: preview.reason }

  const existing = findPosition(run, slotIndex)
  let positions: Position[]

  if (existing) {
    // Merge by weighted average price. openedOnDay stays the first buy day.
    const totalQuantity = existing.quantity + quantity
    const avgPrice = round2(
      (existing.quantity * existing.avgPrice + quantity * price) / totalQuantity,
    )
    positions = run.positions.map((p) =>
      p.slotIndex === slotIndex ? { ...p, quantity: totalQuantity, avgPrice } : p,
    )
  } else {
    positions = [
      ...run.positions,
      { slotIndex, quantity, avgPrice: price, openedOnDay: run.day },
    ]
  }

  return {
    ok: true,
    run: {
      ...run,
      cash: preview.cashAfter,
      positions,
      stats: statsAfterBuy(run.stats, preview.fee),
    },
  }
}

export function applySell(run: RunState, slotIndex: number, quantity: number): TradeResult {
  const slot = run.slots[slotIndex]
  if (!slot) return { ok: false, reason: 'invalidSlot' }

  const position = findPosition(run, slotIndex)
  const price = getPrice(slot)
  const preview = previewSell(position, price, quantity)
  if (!preview.ok || !position) {
    return { ok: false, reason: preview.ok ? 'noPosition' : preview.reason }
  }

  const newCash = round2(run.cash + preview.netProceeds)

  const positions = preview.closesPosition
    ? run.positions.filter((p) => p.slotIndex !== slotIndex)
    : run.positions.map((p) =>
        p.slotIndex === slotIndex ? { ...p, quantity: p.quantity - quantity } : p,
      )

  const holdingDays = preview.closesPosition ? run.day - position.openedOnDay : null

  return {
    ok: true,
    run: {
      ...run,
      cash: newCash,
      positions,
      stats: statsAfterSell(run.stats, preview.fee, preview.realizedPnl, newCash, holdingDays),
    },
  }
}