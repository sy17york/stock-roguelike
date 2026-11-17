// Core game rules. All tunable numbers live here.

// ---------- Base values (edit these) ----------

const START_CASH = 10_000
const STOCKS_PER_DAY = 10

// Candles the player sees (sliding window, fixed)
const VISIBLE_BARS = 90

// Candles before the window, used only for indicators (e.g. MA200)
const WARMUP_BARS = 200

// Candles after the initial window, so a held stock can keep moving
const FUTURE_BARS = 120

// Fresh refreshes allowed per day
const REFRESHES_PER_DAY = 1

// Max entries kept in the system message list
const MAX_SYSTEM_MESSAGES = 50

// Digits of the anonymous stock id
const ANON_ID_DIGITS = 4

// ---------- Exported config ----------

export const GAME = {
  startingCash: START_CASH,
  stocksPerDay: STOCKS_PER_DAY,
  visibleBars: VISIBLE_BARS,
  warmupBars: WARMUP_BARS,
  futureBars: FUTURE_BARS,
  refreshesPerDay: REFRESHES_PER_DAY,
  maxSystemMessages: MAX_SYSTEM_MESSAGES,
  anonIdDigits: ANON_ID_DIGITS,
  // Zoom levels (candles shown). Must not exceed warmupBars, so indicators stay valid.
  zoomLevels: [30, 60, 90, 120, 180],

  // ---------- Derived values (do not edit, computed from above) ----------

  // Total candles per series: warm-up + window + future
  seriesLength: WARMUP_BARS + VISIBLE_BARS + FUTURE_BARS, // 380

  // Index of today's candle when a stock first appears in a slot.
  initialCursor: WARMUP_BARS + VISIBLE_BARS - 1, // 259
} as const