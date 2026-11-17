// Stats panel: three groups of rows. Missing values show "-".

import type { ReactNode } from 'react'
import { deriveStats } from '../../../core/stats'
import type { TextKey } from '../../../i18n'
import { useT } from '../../../i18n/useT'
import { useGame } from '../../../state/useGame'
import { PriceChange } from '../../common/PriceChange'
import styles from './StatsPanel.module.css'

const DASH = '-'

export function StatsPanel() {
  const { state } = useGame()
  const { t, money, number, percent } = useT()
  const { run } = state
  const s = run.stats
  const d = deriveStats(run)

  const row = (label: TextKey, value: ReactNode) => (
    <div className={styles.row} key={label}>
      <span className={styles.label}>{t(label)}</span>
      <span className={styles.value}>{value}</span>
    </div>
  )

  const group = (title: TextKey, rows: ReactNode[]) => (
    <section className={styles.group}>
      <h3 className={styles.title}>{t(title)}</h3>
      {rows}
    </section>
  )

  // Wins always use the "up" color, losses the "down" color
  const win = (v?: number) => (v === undefined ? DASH : <PriceChange value={1} text={money(v)} />)
  const loss = (v?: number) => (v === undefined ? DASH : <PriceChange value={-1} text={money(v)} />)
  const opt = (v: number | undefined, fmt: (n: number) => string) => (v === undefined ? DASH : fmt(v))

  return (
    <>
      {group('stats.overview', [
        row('stats.day', number(run.day, 0)),
        row('stats.buyCount', number(s.buyCount, 0)),
        row('stats.sellCount', number(s.sellCount, 0)),
        row('stats.peakCash', money(s.peakCash)),
        row('stats.assets', money(d.assets)),
        row(
          'stats.returnRate',
          <PriceChange value={d.returnRate} />,
        ),
      ])}

      {group('stats.results', [
        row('stats.winCount', number(s.winCount, 0)),
        row('stats.lossCount', number(s.lossCount, 0)),
        row('stats.winRate', opt(d.winRate, percent)),
        row('stats.avgWin', win(d.avgWin)),
        row('stats.avgLoss', loss(d.avgLoss)),
        row('stats.profitFactor', opt(d.profitFactor, (n) => number(n, 1))),
        row('stats.maxSingleWin', s.winCount > 0 ? win(s.maxSingleWin) : DASH),
        row('stats.maxSingleLoss', s.lossCount > 0 ? loss(s.maxSingleLoss) : DASH),
        row('stats.maxWinStreak', number(s.maxWinStreak, 0)),
        row('stats.maxLossStreak', number(s.maxLossStreak, 0)),
      ])}

      {group('stats.behavior', [
        row('stats.totalFees', money(s.totalFees)),
        row('stats.avgHoldingDays', opt(d.avgHoldingDays, (n) => number(n, 1))),
      ])}
    </>
  )
}