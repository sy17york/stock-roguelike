// Translation helper and number formatting.
// t() keys are typed: a wrong key is a compile error.

import type { Language, NumberFormat } from '../core/types'
import { en } from './en'
import type { Dict } from './en'
import { zh } from './zh'

const dictionaries: Record<Language, Dict> = { en, zh }

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
]

// All dotted paths that end in a string, e.g. 'trade.buy'
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`
}[keyof T & string]

export type TextKey = Paths<Dict>
export type Params = Record<string, string | number>

function lookup(dict: Dict, key: string): string | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

export function translate(lang: Language, key: TextKey, params?: Params): string {
  const text = lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  )
}

// First launch: Chinese browsers get Chinese, everything else English.
export function detectLanguage(): Language {
  const nav = typeof navigator === 'undefined' ? '' : navigator.language
  return nav.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

// ---------- Number formatting ----------

const LOCALES: Record<Language, string> = { en: 'en-US', zh: 'zh-CN' }

export function formatNumber(
  lang: Language,
  value: number,
  format: NumberFormat = 'full',
  decimals = 2,
): string {
  if (format === 'compact' && Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat(LOCALES[lang], {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatMoney(lang: Language, value: number, format: NumberFormat = 'full'): string {
  return `$${formatNumber(lang, value, format)}`
}

export function formatPercent(lang: Language, ratio: number): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio)
}