// Core data types. No logic here, only shapes.

// ---------- Market ----------

import type { FurnitureId, Variant } from '../config/decorations'
import type { IndustryId } from '../config/market'
export type { IndustryId }

// One candle. Prices are split-adjusted (continuous), up to 4 decimals in the data file.
// volume is relative: 100 = average volume of the previous 200 days.
export interface Candle {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// One stock in one period: a slice of the stock's full history.
export interface StockSeries {
  // Hidden game id of the stock. Unique, one id = one full history in the database.
  stockId: string
  industry: IndustryId
  // Index in the full history of this slice's first candle (the first warm-up candle).
  startIndex: number
  // Warm-up + initial window + future candles. Real prices.
  candles: Candle[]
}

// One of the stock list rows on the trading screen.
export interface Slot {
  series: StockSeries
  // Index of today's candle in series.candles.
  // Visible window = candles[cursor - visibleBars + 1 .. cursor]
  // Indicators use candles[0 .. cursor].
  cursor: number
}

// ---------- Portfolio ----------

// A holding in one slot. At most one per slot. Adding shares merges by weighted average.
export interface Position {
  slotIndex: number
  quantity: number // whole shares, >= 1
  avgPrice: number // weighted average cost
  openedOnDay: number // day of the first buy, used for holding-days stat
}

// ---------- Talents ----------

export interface TalentState {
  // Active talent ids (0 to TALENT_RULES.maxEquipped). Changed only by confirming.
  equipped: string[]
  // Day of the last confirmation (null = never). One confirmation per day.
  lastConfirmDay: number | null
}

// ---------- Decoration ----------

// Only the player's choices are stored. What is unlocked is derived from stats.peakCash.
export interface DecorState {
  // Which version of each furniture piece is shown. One is always shown.
  variants: Record<FurnitureId, Variant>
  // Ids of accessories currently switched on
  accessories: string[]
}

// ---------- Messages ----------

// System message. Text lives in i18n (messages.<type>); params fill the placeholders.
export interface SystemMessage {
  day: number
  type: 'delisted'
  params: Record<string, string | number>
}

export interface Messages {
  system: SystemMessage[] // newest last, capped at GAME.maxSystemMessages
  unread: boolean // red dot on the message button
}

// ---------- Stats (accumulated) ----------

export interface Stats {
  buyCount: number
  sellCount: number // every sell counts as one trade
  winCount: number
  lossCount: number
  totalWinAmount: number // sum of positive realized pnl
  totalLossAmount: number // sum of negative realized pnl (stored as positive number)
  maxSingleWin: number
  maxSingleLoss: number // largest single realized loss, amount (also the "max drawdown")
  currentStreak: number // >0 win streak, <0 loss streak
  maxWinStreak: number
  maxLossStreak: number
  totalFees: number
  // Holding days are counted once per full close
  closedPositionCount: number
  totalHoldingDays: number
  // Peak cash after sells; drives decoration unlocks. Unrealized gains do NOT count.
  peakCash: number
}

// ---------- Settings (not reset with a new run) ----------

export type Language = 'zh' | 'en'
export type ColorScheme = 'greenUp' | 'redUp'
export type NumberFormat = 'full' | 'compact'

export interface Settings {
  language: Language
  colorScheme: ColorScheme // default: greenUp
  soundOn: boolean
  numberFormat: NumberFormat
}

// ---------- Whole game ----------

// Everything that belongs to the current run. Reset on a new run.
export interface RunState {
  day: number // starts at 1
  cash: number
  slots: Slot[] // length = GAME.stocksPerDay
  positions: Position[] // at most one per slot
  talents: TalentState
  decor: DecorState
  messages: Messages
  stats: Stats
  // Last day the slot refresh was used (null = never)
  lastRefreshDay: number | null
  // RNG seed state so a save reproduces the same future draws
  rngSeed: number
}

// A slot as stored in a save. Candles are re-cut from the database on load.
export interface SavedSlot {
  stockId: string
  startIndex: number
  // Days elapsed since the stock appeared. cursor = GAME.initialCursor + daysElapsed
  daysElapsed: number
}

// RunState with slots reduced to ids, so a save stays a few KB.
export type SavedRun = Omit<RunState, 'slots'> & { slots: SavedSlot[] }

// Saved to localStorage and used for export/import. One save only, always overwritten.
export interface SaveData {
  version: number // save format version, bump when the shape changes
  dataVersion: number // must match the data file's dataVersion
  settings: Settings
  run: SavedRun
}