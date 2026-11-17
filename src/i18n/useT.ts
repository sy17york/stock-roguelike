// Translation hook bound to the current language and number format.

import { useGame } from '../state/useGame'
import { formatMoney, formatNumber, formatPercent, translate } from './index'
import type { Params, TextKey } from './index'

export function useT() {
  const { state } = useGame()
  const { language, numberFormat } = state.settings

  return {
    lang: language,
    t: (key: TextKey, params?: Params) => translate(language, key, params),
    money: (value: number) => formatMoney(language, value, numberFormat),
    number: (value: number, decimals = 2) => formatNumber(language, value, numberFormat, decimals),
    percent: (ratio: number) => formatPercent(language, ratio),
  }
}