// Level 3: quantity input, live preview, confirm. One component for buy and sell.
// "Confirm" is enabled only when the preview is ok (same check the reducer does).

import { useState } from 'react'
import { anonymousId } from '../../../core/market'
import { positionOf } from '../../../core/chart'
import { getPrice, maxAffordableQuantity, previewBuy, previewSell } from '../../../core/trading'
import { useT } from '../../../i18n/useT'
import { useGame } from '../../../state/useGame'
import { PriceChange } from '../../common/PriceChange'
import { useToast } from '../../Toast/useToast'
import styles from './TradeDialog.module.css'

export type Side = 'buy' | 'sell'

interface TradeDialogProps {
  slotIndex: number
  side: Side
  onCancel: () => void
  onDone: () => void // called after a successful trade
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span>{children}</span>
    </div>
  )
}

export function TradeDialog({ slotIndex, side, onCancel, onDone }: TradeDialogProps) {
  const { state, dispatch } = useGame()
  const { t, money, number } = useT()
  const { showToast } = useToast()
  const [text, setText] = useState('1')

  const { run } = state
  const slot = run.slots[slotIndex]
  const position = positionOf(run, slotIndex)
  const price = getPrice(slot)
  const quantity = text === '' ? NaN : Number(text)

  const buy = side === 'buy' ? previewBuy(price, quantity, run.cash) : undefined
  const sell = side === 'sell' ? previewSell(position, price, quantity) : undefined
  const preview = buy ?? sell!
  const held = position?.quantity ?? 0

  const maxQuantity = side === 'buy' ? maxAffordableQuantity(price, run.cash) : held

  const confirm = () => {
    if (side === 'buy' && buy?.ok) {
      dispatch({ type: 'buy', slotIndex, quantity })
      showToast(t('trade.boughtToast', { quantity, amount: money(buy.totalCost) }))
      onDone()
    } else if (side === 'sell' && sell?.ok) {
      dispatch({ type: 'sell', slotIndex, quantity })
      showToast(t('trade.soldToast', { quantity, amount: money(sell.netProceeds) }))
      onDone()
    }
  }

  const after = side === 'buy' ? held + (Number.isInteger(quantity) ? quantity : 0) : held - (Number.isInteger(quantity) ? quantity : 0)

  return (
    <div className={styles.dialog}>
      <p className={styles.id}>
        {anonymousId(slot.series.stockId)} · {t(`industry.${slot.series.industry}`)}
      </p>

      <Row label={t('trade.currentPrice')}>{money(price)}</Row>

      <div className={styles.input}>
        <label className={styles.label} htmlFor="trade-qty">
          {t('common.quantity')}
        </label>
        <input
          id="trade-qty"
          className={styles.field}
          inputMode="numeric"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
        />
        <button className="btn" onClick={() => setText(String(maxQuantity))}>
          {t('trade.maxBuy')}
        </button>
      </div>

      <hr className={styles.line} />

      {preview.ok && (
        <>
          <Row label={t('trade.positionChange')}>
            {number(held, 0)} → {number(after, 0)}
            {after === 0 ? ` (${t('trade.closed')})` : ''}
          </Row>
          <Row label={t('common.total')}>{money(preview.amount)}</Row>
          <Row label={t('common.fee')}>{money(preview.fee)}</Row>
          {buy?.ok && (
            <>
              <Row label={t('trade.previewBuy')}>{money(buy.totalCost)}</Row>
              <Row label={t('trade.cashAfter')}>{money(buy.cashAfter)}</Row>
            </>
          )}
          {sell?.ok && (
            <>
              <Row label={t('trade.previewSell')}>{money(sell.netProceeds)}</Row>
              <Row label={t('trade.previewPnl')}>
                <PriceChange value={sell.realizedPnl} text={money(sell.realizedPnl)} />
              </Row>
            </>
          )}
        </>
      )}
      {!preview.ok && <p className={styles.error}>{t(`errors.${preview.reason}`)}</p>}

      <div className={styles.actions}>
        <button className="btn" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-accent" disabled={!preview.ok} onClick={confirm}>
          {t('common.confirm')}
        </button>
      </div>
    </div>
  )
}