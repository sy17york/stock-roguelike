import { describe, expect, it } from 'vitest'
import { createInitialGameState, gameReducer } from './reducer'
import { decodeSave, encodeSave, parseSave, serialize } from './save'

let state = createInitialGameState(7)
state = gameReducer(state, { type: 'buy', slotIndex: 0, quantity: 1 })
state = gameReducer(state, { type: 'sleep' })
state = gameReducer(state, { type: 'confirmTalents', ids: ['ma5', 'rsi14'] })
const save = serialize(state.settings, state.run)

describe('save round trip', () => {
  it('restores the exact run', () => {
    const loaded = decodeSave(encodeSave(save))
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(JSON.stringify(loaded.run)).toBe(JSON.stringify(state.run))
  })

  it('stores slots as ids only, so the save stays small', () => {
    expect(save.run.slots[0]).toEqual({
      stockId: state.run.slots[0].series.stockId,
      startIndex: state.run.slots[0].series.startIndex,
      daysElapsed: 1,
    })
    expect(encodeSave(save).length).toBeLessThan(10_000)
  })

  it('keeps unknown settings keys out and fills missing ones with defaults', () => {
    const r = parseSave({ ...save, settings: { language: 'zh' } })
    if (!r.ok) throw new Error(r.reason)
    expect(r.save.settings.language).toBe('zh')
    expect(r.save.settings.colorScheme).toBe('greenUp')
  })
})

describe('broken saves', () => {
  it('rejects garbage and wrong shapes as invalid', () => {
    expect(decodeSave('not base64!!')).toEqual({ ok: false, reason: 'invalidSave' })
    expect(decodeSave(btoa('{"a":1}'))).toEqual({ ok: false, reason: 'invalidSave' })
  })

  it('rejects other save or data versions as incompatible', () => {
    expect(decodeSave(encodeSave({ ...save, version: 1 }))).toEqual({ ok: false, reason: 'incompatibleSave' })
    expect(decodeSave(encodeSave({ ...save, dataVersion: 99 }))).toEqual({ ok: false, reason: 'incompatibleSave' })
  })

  it('rejects a save whose stock no longer exists', () => {
    const slots = save.run.slots.map((s, i) => (i === 0 ? { ...s, stockId: 'GONE' } : s))
    expect(decodeSave(encodeSave({ ...save, run: { ...save.run, slots } }))).toEqual({
      ok: false,
      reason: 'incompatibleSave',
    })
  })

  it('validates talents, decor and messages', () => {
    const bad = (run: object) => decodeSave(encodeSave({ ...save, run: { ...save.run, ...run } as never }))
    expect(bad({ talents: { equipped: ['ghost'], lastConfirmDay: null } })).toEqual({ ok: false, reason: 'invalidSave' })
    expect(bad({ talents: { equipped: ['ma5', 'ma10', 'ma20', 'ma60'], lastConfirmDay: null } }).ok).toBe(false)
    expect(bad({ decor: { ...save.run.decor, variants: { ...save.run.decor.variants, bed: 'gold' } } }).ok).toBe(false)
    expect(bad({ decor: { ...save.run.decor, accessories: ['ghost'] } }).ok).toBe(false)
    expect(bad({ decor: undefined }).ok).toBe(false)
    expect(bad({ messages: { system: [{ day: 1, type: 'nope', params: {} }], unread: false } }).ok).toBe(false)
  })

  it('importing a bad save through the reducer sets an error and keeps the run', () => {
    const s = createInitialGameState(7)
    const after = gameReducer(s, { type: 'importSave', text: 'xxx' })
    expect(after.lastError).toBe('invalidSave')
    expect(after.run).toBe(s.run)
  })

  it('importing a good save replaces the run but keeps settings', () => {
    const s = gameReducer(createInitialGameState(1), { type: 'updateSettings', patch: { language: 'zh' } })
    const after = gameReducer(s, { type: 'importSave', text: encodeSave(save) })
    expect(after.run.positions).toHaveLength(1)
    expect(after.settings.language).toBe('zh')
  })
})