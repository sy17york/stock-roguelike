// Colored text for a gain or loss. Color follows the price color setting.
// Default text is a signed percentage; pass `text` to show something else (e.g. money).

import { useT } from '../../i18n/useT'
import styles from './PriceChange.module.css'

interface PriceChangeProps {
  value: number // sign decides the color
  text?: string
}

export function PriceChange({ value, text }: PriceChangeProps) {
  const { percent } = useT()
  const cls = value > 0 ? styles.up : value < 0 ? styles.down : styles.flat
  const label = text ?? `${value > 0 ? '+' : ''}${percent(value)}`
  return <span className={cls}>{label}</span>
}