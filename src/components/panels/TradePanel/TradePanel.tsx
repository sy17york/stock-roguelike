// Trade panel: level 1 stock list, level 2 detail, level 3 buy/sell dialog.
// After a confirmed trade, levels 2 and 3 close and the list is shown again.

import { useCallback, useState } from 'react'
import { anonymousId } from '../../../core/market'
import { useT } from '../../../i18n/useT'
import { useGame } from '../../../state/useGame'
import { Modal } from '../../Modal/Modal'
import { StockDetail } from './StockDetail'
import { StockList } from './StockList'
import { TradeDialog } from './TradeDialog'
import type { Side } from './TradeDialog'

export function TradePanel() {
  const { state } = useGame()
  const { t } = useT()
  // Nothing is selected when the panel opens
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const [side, setSide] = useState<Side | null>(null)

  const closeTrade = useCallback(() => setSide(null), [])
  const closeAll = useCallback(() => {
    setSide(null)
    setDetailIndex(null)
  }, [])

  const slot = detailIndex === null ? undefined : state.run.slots[detailIndex]
  const title = slot
    ? `${anonymousId(slot.series.stockId)} · ${t(`industry.${slot.series.industry}`)}`
    : ''

  return (
    <>
      <StockList onDetail={setDetailIndex} />

      {slot && detailIndex !== null && (
        <Modal size="wide" title={title} onClose={() => setDetailIndex(null)}>
          <StockDetail slotIndex={detailIndex} onTrade={setSide} />
        </Modal>
      )}

      {slot && detailIndex !== null && side && (
        <Modal
          title={t(side === 'buy' ? 'trade.buy' : 'trade.sell')}
          onClose={closeTrade}
        >
          <TradeDialog
            slotIndex={detailIndex}
            side={side}
            onCancel={closeTrade}
            onDone={closeAll}
          />
        </Modal>
      )}
    </>
  )
}