import { describe, expect, it } from 'vitest'
import { ACCESSORIES } from '../config/decorations'
import { createDefaultDecor, setVariant, syncDecor, toggleAccessory } from './decor'
import { createInitialGameState, gameReducer } from './reducer'

describe('decor unlocking', () => {
  const d0 = createDefaultDecor()

  it('starts with all old furniture and nothing switched on', () => {
    expect(Object.values(d0.variants).every((v) => v === 'old')).toBe(true)
    expect(d0.accessories).toEqual([])
  })

  it('switches on accessories whose threshold was just crossed', () => {
    expect(syncDecor(d0, 10_000, 26_000).accessories).toEqual(['clothes'])
    const all = syncDecor(d0, 10_000, 1_000_000)
    expect(all.accessories).toHaveLength(ACCESSORIES.length)
    expect(new Set(all.accessories).size).toBe(all.accessories.length)
  })

  it('does nothing when peak cash does not rise, and never switches furniture', () => {
    const d1 = syncDecor(d0, 10_000, 26_000)
    expect(syncDecor(d1, 26_000, 26_000)).toBe(d1)
    expect(syncDecor(d0, 10_000, 1_000_000).variants.bed).toBe('old')
  })

  it('does not re-enable an item the player turned off', () => {
    const all = syncDecor(d0, 10_000, 1_000_000)
    const off = { ...all, accessories: all.accessories.filter((a) => a !== 'rug') }
    expect(syncDecor(off, 1_000_000, 2_000_000).accessories).not.toContain('rug')
  })

  it('locks new furniture until its cash is reached; old is always allowed', () => {
    expect(setVariant(d0, 'wardrobe', 'new', 19_999)).toEqual({ ok: false, reason: 'notUnlockedDecor' })
    const ok = setVariant(d0, 'wardrobe', 'new', 20_000)
    if (!ok.ok) throw new Error(ok.reason)
    expect(ok.decor.variants.wardrobe).toBe('new')
    expect(setVariant(ok.decor, 'wardrobe', 'old', 0).ok).toBe(true)
    expect(setVariant(d0, 'sofa' as never, 'new', 9e9)).toEqual({ ok: false, reason: 'unknownDecor' })
  })

  it('toggles unlocked accessories only', () => {
    expect(toggleAccessory(d0, 'clothes', 24_999)).toEqual({ ok: false, reason: 'notUnlockedDecor' })
    const on = toggleAccessory(d0, 'clothes', 25_000)
    if (!on.ok) throw new Error(on.reason)
    expect(on.decor.accessories).toEqual(['clothes'])
    const off = toggleAccessory(on.decor, 'clothes', 25_000)
    if (!off.ok) throw new Error(off.reason)
    expect(off.decor.accessories).toEqual([])
    expect(toggleAccessory(d0, 'nope', 9e9)).toEqual({ ok: false, reason: 'unknownDecor' })
  })

  it('a sell that raises peak cash switches accessories on (through the reducer)', () => {
    let s = createInitialGameState(7)
    s = { ...s, run: { ...s.run, cash: 30_000 } }
    s = gameReducer(s, { type: 'buy', slotIndex: 0, quantity: 1 })
    s = gameReducer(s, { type: 'sell', slotIndex: 0, quantity: 1 })
    expect(s.run.decor.accessories).toContain('clothes')
    expect(s.run.decor.accessories).not.toContain('shoes')
  })
})