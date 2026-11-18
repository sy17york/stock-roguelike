import { describe, expect, it } from 'vitest'
import { GAME } from '../config/game'
import { createNewRun } from '../state/newRun'
import { advanceDay, anonymousId, createInitialSlots, refreshSlots } from './market'
import { createRng } from './rng'
import { getPrice } from './trading'

describe('anonymousId', () => {
  it('has the configured number of digits and is deterministic', () => {
    const id = anonymousId('S0001')
    expect(id).toMatch(new RegExp(`^\\d{${GAME.anonIdDigits}}$`))
    expect(anonymousId('S0001')).toBe(id)
  })
})

describe('createInitialSlots', () => {
  const slots = createInitialSlots(createRng(2024))

  it('draws the configured number of slots at the initial cursor', () => {
    expect(slots).toHaveLength(GAME.stocksPerDay)
    expect(slots.every((s) => s.cursor === GAME.initialCursor)).toBe(true)
  })

  it('never shows the same stock or the same display id twice', () => {
    expect(new Set(slots.map((s) => s.series.stockId)).size).toBe(slots.length)
    expect(new Set(slots.map((s) => anonymousId(s.series.stockId))).size).toBe(slots.length)
  })
})

describe('advanceDay', () => {
  const run0 = createNewRun(2024)

  it('moves the day and every cursor by one', () => {
    const next = advanceDay(run0)
    expect(next.day).toBe(2)
    expect(next.slots.every((s, i) => s.cursor === run0.slots[i].cursor + 1)).toBe(true)
  })

  it('force-sells a held stock whose data ran out, and replaces exhausted slots', () => {
    const last = GAME.seriesLength - 1
    const slots = run0.slots.map((s, i) => (i <= 1 ? { ...s, cursor: last } : s))
    const lastClose = getPrice(slots[0])
    const oldIds = [slots[0].series.stockId, slots[1].series.stockId]
    const held = {
      ...run0,
      slots,
      positions: [{ slotIndex: 0, quantity: 5, avgPrice: lastClose, openedOnDay: 1 }],
    }

    const out = advanceDay(held)

    expect(out.positions).toHaveLength(0)
    expect(out.stats.sellCount).toBe(1)
    expect(out.stats.totalHoldingDays).toBe(1)
    // Only the held stock produces a message; slot 1 is replaced silently
    expect(out.messages.system).toEqual([
      {
        day: 2,
        type: 'delisted',
        params: { id: anonymousId(oldIds[0]), price: lastClose },
      },
    ])
    expect(out.messages.unread).toBe(true)
    expect(out.slots[0].series.stockId).not.toBe(oldIds[0])
    expect(out.slots[1].series.stockId).not.toBe(oldIds[1])
    expect(out.slots[0].cursor).toBe(GAME.initialCursor)
    expect(out.slots[2].cursor).toBe(run0.slots[2].cursor + 1)
    expect(new Set(out.slots.map((s) => anonymousId(s.series.stockId))).size).toBe(GAME.stocksPerDay)
  })
})

describe('refreshSlots', () => {
  const run0 = createNewRun(2024)
  const held = {
    ...run0,
    positions: [{ slotIndex: 2, quantity: 3, avgPrice: 50, openedOnDay: 1 }],
  }

  it('replaces every unheld slot and keeps held ones', () => {
    const result = refreshSlots(held)
    if (!result.ok) throw new Error(result.reason)
    const { slots } = result.run

    expect(slots[2]).toBe(held.slots[2])
    slots.forEach((s, i) => {
      if (i !== 2) expect(s.series.stockId).not.toBe(held.slots[i].series.stockId)
    })
    expect(new Set(slots.map((s) => s.series.stockId)).size).toBe(GAME.stocksPerDay)
    expect(slots.every((s, i) => i === 2 || s.cursor === GAME.initialCursor)).toBe(true)
    expect(result.run.lastRefreshDay).toBe(1)
  })

  it('allows one refresh per day', () => {
    const first = refreshSlots(held)
    if (!first.ok) throw new Error(first.reason)
    expect(refreshSlots(first.run)).toEqual({ ok: false, reason: 'alreadyRefreshed' })
    expect(refreshSlots(advanceDay(first.run)).ok).toBe(true)
  })

  it('gives the same result for the same save', () => {
    const a = refreshSlots(held)
    const b = refreshSlots(held)
    if (!a.ok || !b.ok) throw new Error('refresh failed')
    expect(a.run.slots.map((s) => s.series.stockId)).toEqual(b.run.slots.map((s) => s.series.stockId))
  })
})