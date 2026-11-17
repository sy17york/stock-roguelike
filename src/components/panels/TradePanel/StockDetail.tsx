// Level 2: chart (with equipped indicators), position summary, buy and sell buttons.
// Zoom (how many candles are shown) is local state: not saved, resets when the panel closes.

import { useState } from 'react'
import { GAME } from '../../../config/game'
import { dailyChange, getVisibleCandles, holdingDays, positionOf, unrealizedRatio } from '../../../core/chart'
import { buildChartLayers } from '../../../core/indicators'
import { getPrice, previewBuy, round2 } from '../../../core/trading'
import { useT } from '../../../i18n/useT'
import { useGame } from '../../../state/useGame'
import { PriceChange } from '../../common/PriceChange'
import { CandleChart } from './CandleChart'
import styles from './StockDetail.module.css'
import type { Side } from './TradeDialog'

interface StockDetailProps {
  slotIndex: number
  onTrade: (side: Side) => void
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  )
}

export function StockDetail({ slotIndex, onTrade }: StockDetailProps) {
  const { state } = useGame()
  const { t, money, number } = useT()
  const { run } = state
  const slot = run.slots[slotIndex]
  const position = positionOf(run, slotIndex)
  const price = getPrice(slot)

  const levels = GAME.zoomLevels
  const [zoomIndex, setZoomIndex] = useState(() => Math.max(0, levels.indexOf(GAME.visibleBars)))
  const count = levels[zoomIndex]

  // Indicators come from the equipped talents; they only use candles up to today
  const layers = buildChartLayers(run.talents.equipped, slot.series.candles, slot.cursor, 3, count)

  // Same rules as the trade preview: no holding = no sell, cannot afford 1 share = no buy
  const canBuy = previewBuy(price, 1, run.cash).ok
  const canSell = position !== undefined

  return (
    <div className={styles.detail}>
      <div className={styles.summary}>
        <Stat label={t('trade.currentPrice')}>
          {money(price)} <PriceChange value={dailyChange(slot)} />
        </Stat>
        {position ? (
          <>
            <Stat label={t('trade.shares')}>{number(position.quantity, 0)}</Stat>
            <Stat label={t('trade.avgCost')}>{money(position.avgPrice)}</Stat>
            <Stat label={t('trade.marketValue')}>{money(round2(price * position.quantity))}</Stat>
            <Stat label={t('trade.unrealized')}>
              <PriceChange
                value={price - position.avgPrice}
                text={money(round2((price - position.avgPrice) * position.quantity))}
              />{' '}
              <PriceChange value={unrealizedRatio(position, price)} />
            </Stat>
            <Stat label={t('trade.holding')}>
              {t('trade.heldDays', { days: holdingDays(run.day, position) })}
            </Stat>
          </>
        ) : (
          <Stat label={t('trade.holding')}>{t('trade.notHeld')}</Stat>
        )}
      </div>

      <CandleChart
        candles={getVisibleCandles(slot, count)}
        layers={layers}
        zoom={{
          // "+" shows fewer candles (bigger), "-" shows more
          onIn: () => setZoomIndex((i) => Math.max(0, i - 1)),
          onOut: () => setZoomIndex((i) => Math.min(levels.length - 1, i + 1)),
          canIn: zoomIndex > 0,
          canOut: zoomIndex < levels.length - 1,
        }}
      />

      <div className={styles.actions}>
        <button className="btn btn-accent" disabled={!canBuy} onClick={() => onTrade('buy')}>
          {t('trade.buy')}
        </button>
        <button className="btn" disabled={!canSell} onClick={() => onTrade('sell')}>
          {t('trade.sell')}
        </button>
      </div>
    </div>
  )
}