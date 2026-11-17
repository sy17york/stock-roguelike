// Shared shapes. Every series has the same length as the candles; unknown values are null.

export type Series = (number | null)[]

export interface IndicatorLine {
  key: string // also used for the legend name later
  values: Series
  color: string
  // 'line' (default), 'bar' (histogram), 'volume' (bars colored by candle direction)
  style?: 'line' | 'bar' | 'volume'
}

export interface IndicatorLevel {
  price: number
  kind: 'support' | 'resistance'
}

export interface IndicatorResult {
  id: string // the talent id that produced it
  placement: 'overlay' | 'sub' // main chart / sub chart below it
  lines: IndicatorLine[]
  levels?: IndicatorLevel[] // support / resistance only
  guides?: number[] // horizontal reference lines, e.g. RSI 70 / 30
}

// What the individual indicator files return; index.ts adds the id.
export type IndicatorBody = Omit<IndicatorResult, 'id'>