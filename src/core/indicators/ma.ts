// Moving averages shared by many indicators. Both skip over null gaps:
// a window only counts once it is filled with real values.

import type { Series } from './types'

export function sma(values: Series, period: number): Series {
  const out: Series = new Array(values.length).fill(null)
  let sum = 0
  let run = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v === null) {
      sum = 0
      run = 0
      continue
    }
    sum += v
    run += 1
    if (run > period) sum -= values[i - period] as number
    if (run >= period) out[i] = sum / period
  }
  return out
}

// Exponential average, seeded with the simple average of the first full window.
export function ema(values: Series, period: number): Series {
  const out: Series = new Array(values.length).fill(null)
  const k = 2 / (period + 1)
  let prev: number | null = null
  let run = 0
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v === null) {
      prev = null
      run = 0
      sum = 0
      continue
    }
    if (prev === null) {
      run += 1
      sum += v
      if (run === period) {
        prev = sum / period
        out[i] = prev
      }
    } else {
      prev = v * k + prev * (1 - k)
      out[i] = prev
    }
  }
  return out
}