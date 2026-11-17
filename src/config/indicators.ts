// Indicator parameters and line colors. Colors are separate from the up/down price colors.

export const MA_PERIODS: Record<string, number> = {
  ma5: 5,
  ma10: 10,
  ma20: 20,
  ma60: 60,
  ma200: 200,
}

export const INDICATOR_PARAMS = {
  boll: { period: 20, mult: 2 },
  rsi: { period: 14, fast: 7, slow: 21, upper: 70, lower: 30 },
  macd: { fast: 12, slow: 26, signal: 9 },
  kdj: { period: 9, smooth: 3, upper: 80, lower: 20 },
  atr: { period: 14 },
  volMa: { period: 20 },
  obv: { maPeriod: 20 },
  levels: {
    swingSide: 3, // a swing point is higher/lower than this many candles on each side
    clusterPct: 0.015, // swing points within 1.5% of each other form one line
    minTouches: 3, // points needed to draw a line
    lookback: 120, // candles searched for swing points
    breakDays: 3, // consecutive closes beyond a line remove it
  },
} as const

const COLORS: Record<string, string> = {
  ma5: '#f5c842',
  ma10: '#f08c3c',
  ma20: '#d96bd9',
  ma60: '#4aa8f0',
  ma200: '#f2f2f2',
  bollMid: '#d96bd9',
  bollUpper: '#7fd0c0',
  bollLower: '#7fd0c0',
  rsi14: '#f5c842',
  rsi7: '#f5c842',
  rsi21: '#4aa8f0',
  macd: '#f5c842',
  signal: '#4aa8f0',
  hist: '#9a8a6c',
  k: '#f5c842',
  d: '#4aa8f0',
  j: '#d96bd9',
  atr: '#f08c3c',
  obv: '#f5c842',
  obvMa: '#4aa8f0',
  volMa: '#f5c842',
  resistance: '#e07070',
  support: '#70c0e0',
  vol: '#9a8a6c',
}

export function colorOf(key: string): string {
  return COLORS[key] ?? '#cccccc'
}