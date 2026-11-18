import { describe, expect, it } from 'vitest'
import { createDefaultTalents, confirmTalents, hasConfirmedToday, needsTalentAttention } from './talents'

describe('talents', () => {
  it('starts empty and asks for attention', () => {
    const t = createDefaultTalents()
    expect(t).toEqual({ equipped: [], lastConfirmDay: null })
    expect(needsTalentAttention(t)).toBe(true)
  })

  it('confirms 1 to 3 talents and takes effect immediately', () => {
    const r = confirmTalents(createDefaultTalents(), ['ma5', 'rsi14'], 1)
    if (!r.ok) throw new Error(r.reason)
    expect(r.talents).toEqual({ equipped: ['ma5', 'rsi14'], lastConfirmDay: 1 })
    expect(needsTalentAttention(r.talents)).toBe(true) // fewer than 3
    expect(hasConfirmedToday(r.talents, 1)).toBe(true)
  })

  it('allows one confirmation per day', () => {
    const first = confirmTalents(createDefaultTalents(), ['ma5'], 1)
    if (!first.ok) throw new Error(first.reason)
    expect(confirmTalents(first.talents, ['vol'], 1)).toEqual({ ok: false, reason: 'alreadyConfirmedToday' })
    const next = confirmTalents(first.talents, ['ma5', 'rsi14', 'vol'], 2)
    if (!next.ok) throw new Error(next.reason)
    expect(needsTalentAttention(next.talents)).toBe(false) // full
  })

  it('rejects invalid selections', () => {
    const t = createDefaultTalents()
    expect(confirmTalents(t, [], 1)).toEqual({ ok: false, reason: 'emptySelection' })
    expect(confirmTalents(t, ['ma5', 'ma10', 'ma20', 'ma60'], 1)).toEqual({ ok: false, reason: 'tooManyTalents' })
    expect(confirmTalents(t, ['ma5', 'ma5'], 1)).toEqual({ ok: false, reason: 'duplicateTalent' })
    expect(confirmTalents(t, ['zzz'], 1)).toEqual({ ok: false, reason: 'unknownTalent' })
  })
})