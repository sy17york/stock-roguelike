// Level 1: the 10 stocks. Held stocks are marked with cost and holding time.

import { anonymousId } from '../../../core/market'
import { dailyChange, holdingDays, positionOf, unrealizedRatio } from '../../../core/chart'
import { getPrice } from '../../../core/trading'
import { useT } from '../../../i18n/useT'
import { useGame } from '../../../state/useGame'
import { PriceChange } from '../../common/PriceChange'
import styles from './StockList.module.css'

interface StockListProps {
  onDetail: (slotIndex: number) => void
}

export function StockList({ onDetail }: StockListProps) {
  const { state, dispatch } = useGame()
  const { t, money, number } = useT()
  const { run } = state
  const refreshUsed = run.lastRefreshDay === run.day

  return (
    <div>
      <ul className={styles.list}>
        {run.slots.map((slot, index) => {
          const position = positionOf(run, index)
          const price = getPrice(slot)
          return (
            <li key={index} className={`${styles.row} ${position ? styles.held : ''}`}>
              <span className={styles.id}>{anonymousId(slot.series.stockId)}</span>
              <span>{t(`industry.${slot.series.industry}`)}</span>
              <span>{money(price)}</span>
              <PriceChange value={dailyChange(slot)} />

              <span className={styles.holding}>
                {position ? (
                  <>
                    <span>
                      <span className={styles.dot}>● </span>
                      {t('trade.holdingSummary', {
                        shares: number(position.quantity, 0),
                        cost: money(position.avgPrice),
                      })}
                    </span>
                    <span className={styles.sub}>
                      {t('trade.heldDays', { days: holdingDays(run.day, position) })}{' '}
                      <PriceChange value={unrealizedRatio(position, price)} />
                    </span>
                  </>
                ) : (
                  <span className={styles.sub}>{t('trade.notHeld')}</span>
                )}
              </span>

              <button className="btn" onClick={() => onDetail(index)}>
                {t('trade.details')}
              </button>
            </li>
          )
        })}
      </ul>

      <div className={styles.footer}>
        <button
          className={`btn ${refreshUsed ? styles.used : ''}`}
          onClick={() => dispatch({ type: 'refresh' })}
        >
          {t('trade.refresh')}
        </button>
      </div>
    </div>
  )
}