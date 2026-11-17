// Pure helpers for the stock screens. No React, no drawing.

import { GAME } from '../config/game'
import type { Candle, Position, RunState, Slot } from './types'

// The candles the player sees: the last `count` ending at today's candle.
export function getVisibleCandles(slot: Slot, count: number = GAME.visibleBars): Candle[] {
  const end = slot.cursor + 1
  return slot.series.candles.slice(Math.max(0, end - count), end)
}

export interface PriceRange {
  min: number
  max: number
}

// Lowest low to highest high, with a little padding so candles do not touch the edges.
export function priceRange(candles: Candle[]): PriceRange {
  let min = Infinity
  let max = -Infinity
  for (const c of candles) {
    if (c.low < min) min = c.low
    if (c.high > max) max = c.high
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  const pad = (max - min) * 0.05 || max * 0.01
  return { min: min - pad, max: max + pad }
}

export function maxVolume(candles: Candle[]): number {
  return candles.reduce((m, c) => Math.max(m, c.volume), 0)
}

// Today's close vs yesterday's close, as a ratio (0.012 = +1.2%).
export function dailyChange(slot: Slot): number {
  const { candles } = slot.series
  const prev = candles[slot.cursor - 1]?.close
  if (!prev) return 0
  return candles[slot.cursor].close / prev - 1
}

export function positionOf(run: RunState, slotIndex: number): Position | undefined {
  return run.positions.find((p) => p.slotIndex === slotIndex)
}

// Days since the first buy of this holding (0 on the day it was bought).
export function holdingDays(day: number, position: Position): number {
  return day - position.openedOnDay
}

// Unrealized profit ratio before fees (0.1 = +10%).
export function unrealizedRatio(position: Position, price: number): number {
  return position.avgPrice > 0 ? price / position.avgPrice - 1 : 0
}

// The last `count` values of a series (the visible window). Series are as long as candles[0..cursor].
export function sliceVisible<T>(values: T[], count: number = GAME.visibleBars): T[] {
  return values.slice(Math.max(0, values.length - count))
}