# stock-roguelike

[![CI](https://github.com/sy17york/stock-roguelike/actions/workflows/ci.yml/badge.svg)](https://github.com/sy17york/stock-roguelike/actions/workflows/ci.yml)

A pixel-style stock trading game. Read blind charts of real S&P 500 history, trade, pick indicators, and earn money to decorate your room.

**Play it: https://stock-roguelike.vercel.app**

<!-- Add screenshots here: room, stock detail with indicators, talents panel -->

## How it works

- You see 10 stocks. Names and dates are hidden; only the industry is shown.
- Each stock is a random period of real price history. Sleeping moves every chart forward one day.
- Buy and sell at the close. Pick up to 3 chart indicators (moving averages, RSI, MACD, KDJ, Bollinger, ATR, OBV, support/resistance...).
- Your peak cash unlocks furniture and decorations in your room.
- Progress saves automatically in the browser. English and Chinese are supported.

## Built with AI

Almost all of the code in this project was written by AI (Claude), working from my design decisions. My role was product design, rules and balance, data pipeline requirements, reviewing, running, and testing every step, and deployment. The history of design discussions is reflected in the structure below.

## Tech stack

React 19, TypeScript, Vite, CSS Modules, Canvas 2D (charts), Vitest, ESLint, GitHub Actions (CI), Vercel (hosting). Data preparation uses Python (pandas, yfinance) and is kept outside this repo.

## Architecture

```
src/
  config/      numbers and ids only (fees, decor tiers, indicator parameters)
  core/        pure TypeScript game rules: trading, sampling, indicators. No React.
  state/       reducer, save/load, talents, decor
  i18n/        English and Chinese text, type-checked so no key can be missed
  components/  React UI and canvas chart
  data/        cleaned, anonymized price data (stocks.json)
```

Highlights:

- Game rules are pure functions, covered by 90+ unit tests and run in CI on every push.
- Seeded random numbers; a save stores only stock ids and positions, then rebuilds charts from the data.
- Indicators only use candles up to "today" (tested so they never see the future).
- Chinese translations must match the English keys exactly, enforced by the compiler.

## Data and disclaimer

Price data comes from Yahoo Finance (current S&P 500 members, daily, 2010 onward) and is used here for personal, educational purposes. Tickers and dates are removed, and prices are rescaled per segment. This game is not investment advice. Past prices do not predict future results.

## Run locally

```
npm install
npm run dev
npm test
```

## Roadmap

Real pixel art for the room, weather system, on-demand data loading, mobile layout.

## License

[PolyForm Strict 1.0.0](LICENSE). Free to play and read for noncommercial purposes. Modifying, redistributing or commercial use is not permitted.