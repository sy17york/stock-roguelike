// Slot lifecycle: initial draw, daily advance, daily refresh, anonymous ids.
// Pure functions: state in, new state out. No React, no display text.

import { GAME } from '../config/game'
import { MARKET } from '../config/market'
import { createRng } from './rng'
import type { Rng } from './rng'
import { pickSeries } from './sampling'
import { applySell } from './trading'
import type { RunState, Slot, SystemMessage } from './types'

// ---------- Anonymous display id ----------

// FNV-1a 32-bit hash of (salt + stockId), reduced to N digits.
// Display only. Never used to look anything up.
export function anonymousId(stockId: string): string {
  const text = MARKET.anonIdSalt + stockId
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  const modulo = 10 ** GAME.anonIdDigits
  return String(hash % modulo).padStart(GAME.anonIdDigits, '0')
}

// ---------- Drawing slots ----------

const ID_COLLISION_RETRIES = 50
const LAST_INDEX = GAME.seriesLength - 1

// Draw a fresh slot whose stockId is not excluded and whose display id
// does not collide with a display id already on screen.
function drawSlot(rng: Rng, excludedIds: Set<string>, usedDisplayIds: Set<string>): Slot {
  const excluded = new Set(excludedIds)
  for (let attempt = 0; attempt < ID_COLLISION_RETRIES; attempt++) {
    const series = pickSeries(rng, excluded)
    if (!usedDisplayIds.has(anonymousId(series.stockId))) {
      return { series, cursor: GAME.initialCursor }
    }
    excluded.add(series.stockId)
  }
  throw new Error('Could not draw a slot without a display id collision')
}

// Replace the slot at `index`, avoiding every stock currently on screen
// (this also avoids all held stocks, since held stocks are on screen).
function replaceSlot(rng: Rng, slots: Slot[], index: number): Slot[] {
  const stockIds = new Set(slots.map((s) => s.series.stockId))
  const displayIds = new Set(slots.map((s) => anonymousId(s.series.stockId)))
  const next = [...slots]
  next[index] = drawSlot(rng, stockIds, displayIds)
  return next
}

export function createInitialSlots(rng: Rng): Slot[] {
  const stockIds = new Set<string>()
  const displayIds = new Set<string>()
  const slots: Slot[] = []
  for (let i = 0; i < GAME.stocksPerDay; i++) {
    const slot = drawSlot(rng, stockIds, displayIds)
    stockIds.add(slot.series.stockId)
    displayIds.add(anonymousId(slot.series.stockId))
    slots.push(slot)
  }
  return slots
}

// ---------- Daily advance ----------

function appendSystemMessage(run: RunState, message: SystemMessage): RunState {
  const system = [...run.messages.system, message].slice(-GAME.maxSystemMessages)
  return { ...run, messages: { ...run.messages, system, unread: true } }
}

// Called when the player sleeps. Day +1, every window moves one candle.
// A stock whose data ran out is force-sold (if held) and replaced.
export function advanceDay(run: RunState): RunState {
  const rng = createRng(run.rngSeed)
  const day = run.day + 1

  // Step 1: move every cursor. Exhausted slots stay on their last candle for now.
  const exhausted: number[] = []
  const slots = run.slots.map((slot, i) => {
    if (slot.cursor >= LAST_INDEX) {
      exhausted.push(i)
      return slot
    }
    return { ...slot, cursor: slot.cursor + 1 }
  })

  let state: RunState = { ...run, day, slots }

  // Step 2: held + exhausted -> sell everything at the last close, same logic as a manual sell.
  for (const index of exhausted) {
    const position = state.positions.find((p) => p.slotIndex === index)
    if (!position) continue

    const result = applySell(state, index, position.quantity)
    if (!result.ok) throw new Error(`Forced sell failed: ${result.reason}`)

    const slot = state.slots[index]
    const price = slot.series.candles[slot.cursor].close
    state = appendSystemMessage(result.run, {
      day,
      type: 'delisted',
      params: { id: anonymousId(slot.series.stockId), price },
    })
  }

  // Step 3: replace every exhausted slot (held ones are now position-free).
  let newSlots = state.slots
  for (const index of exhausted) {
    newSlots = replaceSlot(rng, newSlots, index)
  }

  return { ...state, slots: newSlots, rngSeed: rng.state() }
}

// ---------- Daily refresh ----------

export type RefreshResult =
  | { ok: true; run: RunState }
  | { ok: false; reason: 'alreadyRefreshed' }

// Once per day: replace every slot that has no position.
export function refreshSlots(run: RunState): RefreshResult {
  if (run.lastRefreshDay === run.day) return { ok: false, reason: 'alreadyRefreshed' }

  const rng = createRng(run.rngSeed)
  const held = new Set(run.positions.map((p) => p.slotIndex))

  let slots = run.slots
  for (let i = 0; i < slots.length; i++) {
    if (held.has(i)) continue
    slots = replaceSlot(rng, slots, i)
  }

  return {
    ok: true,
    run: { ...run, slots, lastRefreshDay: run.day, rngSeed: rng.state() },
  }
}