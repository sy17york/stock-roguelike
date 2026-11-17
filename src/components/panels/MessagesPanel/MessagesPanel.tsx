// System messages, newest first. Text comes from messages.<type>.
// To add a message type: extend SystemMessage['type'] and add messages.<type> to i18n.

import type { TextKey } from '../../../i18n'
import { useT } from '../../../i18n/useT'
import { useGame } from '../../../state/useGame'
import styles from './MessagesPanel.module.css'

export function MessagesPanel() {
  const { state } = useGame()
  const { t, money } = useT()
  const messages = [...state.run.messages.system].reverse()

  if (messages.length === 0) return <p className={styles.empty}>{t('messages.empty')}</p>

  return (
    <ul className={styles.list}>
      {messages.map((m, i) => {
        // Prices are numbers in the data; format them for the current language
        const params = { ...m.params }
        if (typeof params.price === 'number') params.price = money(params.price)
        return (
          <li key={i} className={styles.row}>
            <span className={styles.day}>{t('messages.day', { day: m.day })}</span>
            <span>{t(`messages.${m.type}` as TextKey, params)}</span>
          </li>
        )
      })}
    </ul>
  )
}