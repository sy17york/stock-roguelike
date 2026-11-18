import { describe, expect, it } from 'vitest'
import { getPrice } from '../core/trading'
import { createInitialGameState, gameReducer } from './reducer'

describe('gameReducer', () => {
  it('buys and sells, clearing the error on success', () => {
    let s = createInitialGameState(7)
    s = gameReducer(s, { type: 'buy', slotIndex: 0, quantity: 1 })
    expect(s.run.positions).toHaveLength(1)
    expect(s.run.cash).toBeLessThan(10_000 - getPrice(s.run.slots[0]) + 0.001)
    expect(s.lastError).toBeNull()
    s = gameReducer(s, { type: 'sell', slotIndex: 0, quantity: 1 })
    expect(s.run.positions).toHaveLength(0)
  })

  it('stores failures as codes and bumps errorSeq every time', () => {
    let s = createInitialGameState(7)
    s = gameReducer(s, { type: 'buy', slotIndex: 0, quantity: 99_999 })
    expect(s.lastError).toBe('insufficientCash')
    expect(s.errorSeq).toBe(1)
    s = gameReducer(s, { type: 'buy', slotIndex: 0, quantity: 99_999 })
    expect(s.errorSeq).toBe(2)
  })

  it('refreshes once per day, and sleeping restores it', () => {
    let s = createInitialGameState(7)
    s = gameReducer(s, { type: 'refresh' })
    expect(s.lastError).toBeNull()
    s = gameReducer(s, { type: 'refresh' })
    expect(s.lastError).toBe('alreadyRefreshed')
    s = gameReducer(s, { type: 'sleep' })
    s = gameReducer(s, { type: 'refresh' })
    expect(s.lastError).toBeNull()
  })

  it('confirms talents once per day', () => {
    let s = createInitialGameState(11)
    s = gameReducer(s, { type: 'confirmTalents', ids: ['macd', 'vol'] })
    expect(s.run.talents.equipped).toEqual(['macd', 'vol'])
    s = gameReducer(s, { type: 'confirmTalents', ids: ['ma5'] })
    expect(s.lastError).toBe('alreadyConfirmedToday')
    s = gameReducer(s, { type: 'sleep' })
    s = gameReducer(s, { type: 'confirmTalents', ids: ['ma5'] })
    expect(s.run.talents.equipped).toEqual(['ma5'])
  })

  it('marks messages read, updates settings, and starts a new run keeping settings', () => {
    let s = createInitialGameState(7)
    s = { ...s, run: { ...s.run, messages: { ...s.run.messages, unread: true } } }
    s = gameReducer(s, { type: 'markMessagesRead' })
    expect(s.run.messages.unread).toBe(false)

    s = gameReducer(s, { type: 'updateSettings', patch: { language: 'zh' } })
    s = gameReducer(s, { type: 'buy', slotIndex: 0, quantity: 1 })
    const fresh = gameReducer(s, { type: 'newRun', seed: 99 })
    expect(fresh.run.day).toBe(1)
    expect(fresh.run.positions).toHaveLength(0)
    expect(fresh.settings.language).toBe('zh')
  })
})