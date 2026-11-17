// Top bar: day, panel buttons on the left; cash, assets, messages, help on the right.

import { calcAssets } from '../../core/assets'
import { needsTalentAttention } from '../../state/talents'
import { useGame } from '../../state/useGame'
import { useT } from '../../i18n/useT'
import type { TextKey } from '../../i18n'
import type { PanelId } from '../panels'
import styles from './TopBar.module.css'

interface TopBarProps {
  onOpen: (panel: PanelId) => void
}

const LEFT_BUTTONS: { id: PanelId; label: TextKey }[] = [
  { id: 'stats', label: 'topbar.stats' },
  { id: 'talents', label: 'topbar.talents' },
  { id: 'decor', label: 'topbar.decorations' },
  { id: 'settings', label: 'topbar.settings' },
]

export function TopBar({ onOpen }: TopBarProps) {
  const { state } = useGame()
  const { t, money } = useT()
  const { run } = state

  // Red dots are derived from state, never stored
  const dots: Partial<Record<PanelId, boolean>> = {
    talents: needsTalentAttention(run.talents),
    messages: run.messages.unread,
  }

  const button = (id: PanelId, label: TextKey) => (
    <button
      key={id}
      className={`${styles.button} ${dots[id] ? styles.dot : ''}`}
      onClick={() => onOpen(id)}
    >
      {t(label)}
    </button>
  )

  return (
    <header className={styles.bar}>
      <section className={styles.left}>
        <div className={styles.day}>{t('topbar.day', { day: String(run.day).padStart(2, '0') })}</div>
        <nav className={styles.nav}>{LEFT_BUTTONS.map((b) => button(b.id, b.label))}</nav>
      </section>

      <section className={styles.right}>
        <div className={styles.stat}>
          <span className={styles.label}>{t('topbar.cash')}</span>
          <span className={`${styles.value} ${styles.cash}`}>{money(run.cash)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>{t('topbar.assets')}</span>
          <span className={`${styles.value} ${styles.assets}`}>{money(calcAssets(run))}</span>
        </div>
        {button('messages', 'topbar.messages')}
        {button('help', 'topbar.help')}
      </section>
    </header>
  )
}