import { describe, expect, it } from 'vitest'
import { ACCESSORIES, ACCESSORY_GROUPS, FURNITURE_IDS } from '../config/decorations'
import { INDUSTRIES } from '../config/market'
import { TALENT_BRANCHES } from '../config/talents'
import { en } from './en'
import { formatMoney, formatPercent, translate } from './index'
import type { TextKey } from './index'
import { zh } from './zh'

function paths(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix]
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k))
}

const missing = (lang: 'en' | 'zh', key: string) => translate(lang, key as TextKey) === key

describe('translations', () => {
  it('Chinese has exactly the same keys as English', () => {
    expect(paths(zh).sort()).toEqual(paths(en).sort())
  })

  it('no text is empty', () => {
    for (const dict of [en, zh]) for (const key of paths(dict)) expect(translate(dict === en ? 'en' : 'zh', key as TextKey).length).toBeGreaterThan(0)
  })

  it('every game id has a name in both languages', () => {
    for (const lang of ['en', 'zh'] as const) {
      for (const b of TALENT_BRANCHES) {
        expect(missing(lang, `talent.branch.${b.id}`)).toBe(false)
        expect(missing(lang, `talent.branchTip.${b.id}`)).toBe(false)
        for (const n of b.nodes) {
          expect(missing(lang, `talent.${n.id}.name`)).toBe(false)
          expect(missing(lang, `talent.${n.id}.desc`)).toBe(false)
        }
      }
      for (const f of FURNITURE_IDS) expect(missing(lang, `decoration.furniture.${f}`)).toBe(false)
      for (const g of ACCESSORY_GROUPS) expect(missing(lang, `decoration.group.${g}`)).toBe(false)
      for (const a of ACCESSORIES) expect(missing(lang, `decoration.item.${a.id}`)).toBe(false)
      for (const i of INDUSTRIES) expect(missing(lang, `industry.${i}`)).toBe(false)
    }
  })
})

describe('placeholders and formatting', () => {
  it('fills placeholders and keeps missing ones visible', () => {
    expect(translate('en', 'topbar.day', { day: 12 })).toBe('DAY 12')
    expect(translate('zh', 'topbar.day', { day: 12 })).toBe('第 12 天')
    expect(translate('en', 'topbar.day')).toBe('DAY {day}')
  })

  it('formats money and percentages', () => {
    expect(formatMoney('en', 12_345.5)).toBe('$12,345.50')
    expect(formatMoney('en', 1_234_567, 'compact')).toBe('$1.2M')
    expect(formatPercent('en', 0.123)).toBe('12.3%')
  })
})