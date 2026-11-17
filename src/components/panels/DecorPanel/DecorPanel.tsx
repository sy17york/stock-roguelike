// Decor list: every item is always listed, sorted by unlock cash.
// Items whose cash threshold is not reached are dimmed and cannot be toggled.
// Old furniture is never listed: it is always there, and a new piece shown on top covers it.

import { ACCESSORIES, FURNITURE_IDS, NEW_FURNITURE_CASH } from '../../../config/decorations'
import type { AccessoryId, FurnitureId } from '../../../config/decorations'
import { useT } from '../../../i18n/useT'
import { isAccessoryUnlocked, isVariantUnlocked } from '../../../state/decor'
import { useGame } from '../../../state/useGame'
import styles from './DecorPanel.module.css'

type Item =
  | { kind: 'furniture'; id: FurnitureId; requiredCash: number }
  | { kind: 'accessory'; id: AccessoryId; requiredCash: number }

// Built once: new furniture versions plus accessories, lowest unlock cash first
const ITEMS: Item[] = [
  ...FURNITURE_IDS.map((id): Item => ({ kind: 'furniture', id, requiredCash: NEW_FURNITURE_CASH[id] })),
  ...ACCESSORIES.map((a): Item => ({ kind: 'accessory', id: a.id, requiredCash: a.requiredCash })),
].sort((a, b) => a.requiredCash - b.requiredCash)

export function DecorPanel() {
  const { state, dispatch } = useGame()
  const { t, money } = useT()
  const { decor } = state.run
  const peak = state.run.stats.peakCash

  return (
    <>
      <div className={styles.peak}>
        <span className={styles.peakLabel}>{t('decoration.peak')}</span>
        <span className={styles.peakValue}>{money(peak)}</span>
      </div>

      <ul className={styles.list}>
        {ITEMS.map((item) => {
          const unlocked =
            item.kind === 'furniture'
              ? isVariantUnlocked(item.id, 'new', peak)
              : isAccessoryUnlocked(item.id, peak)
          const on =
            item.kind === 'furniture'
              ? decor.variants[item.id] === 'new'
              : decor.accessories.includes(item.id)

          const name =
            item.kind === 'furniture'
              ? `${t(`decoration.furniture.${item.id}`)} · ${t('decoration.new')}`
              : t(`decoration.item.${item.id}`)

          const toggle = () =>
            item.kind === 'furniture'
              ? dispatch({ type: 'setVariant', furniture: item.id, variant: on ? 'old' : 'new' })
              : dispatch({ type: 'toggleAccessory', id: item.id })

          return (
            <li key={`${item.kind}-${item.id}`} className={`${styles.row} ${unlocked ? '' : styles.locked}`}>
              <span className={styles.name}>{name}</span>
              <span className={styles.cash}>{money(item.requiredCash)}</span>
              <button
                className={`btn ${on ? 'btn-accent' : ''}`}
                disabled={!unlocked}
                onClick={toggle}
              >
                {on ? t('common.on') : t('common.off')}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}