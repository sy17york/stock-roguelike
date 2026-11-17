// Talent panel. The draft is local state: it starts as a copy of the active talents,
// only changes here, and is thrown away when the panel closes.
// Nothing takes effect until the player presses Confirm (once per day).

import { useState } from 'react'
import { TALENT_BRANCHES, TALENT_RULES } from '../../../config/talents'
import type { TextKey } from '../../../i18n'
import { useT } from '../../../i18n/useT'
import { hasConfirmedToday } from '../../../state/talents'
import { useGame } from '../../../state/useGame'
import { useToast } from '../../Toast/useToast'
import styles from './TalentPanel.module.css'

export function TalentPanel() {
  const { state, dispatch } = useGame()
  const { t } = useT()
  const { showToast } = useToast()
  const { run } = state

  const [draft, setDraft] = useState<string[]>(() => run.talents.equipped)

  const confirmedToday = hasConfirmedToday(run.talents, run.day)
  const full = draft.length >= TALENT_RULES.maxEquipped

  const canAdd = (id: string) => !confirmedToday && !full && !draft.includes(id)
  const canReset = !confirmedToday && draft.length > 0
  const canConfirm = !confirmedToday && draft.length > 0

  const nameOf = (id: string) => t(`talent.${id}.name` as TextKey)

  const confirm = () => {
    if (!canConfirm) return
    dispatch({ type: 'confirmTalents', ids: draft })
    showToast(t('talent.confirmedToast'))
  }

  const slots = Array.from({ length: TALENT_RULES.maxEquipped }, (_, i) => draft[i])

  return (
    <>
      <div className={styles.equipped}>
        <span className={styles.equippedLabel}>{t('talent.equipped')}</span>
        <div className={styles.cells}>
          {slots.map((id, i) => (
            <span key={i} className={styles.cell}>
              {id ? nameOf(id) : t('talent.empty')}
            </span>
          ))}
        </div>
        <button className="btn" disabled={!canReset} onClick={() => setDraft([])}>
          {t('talent.reset')}
        </button>
        <button className="btn btn-accent" disabled={!canConfirm} onClick={confirm}>
          {t('common.confirm')}
        </button>
      </div>
      <p className={styles.hint}>
        {t(confirmedToday ? 'talent.hintConfirmed' : 'talent.hintCanChange')}
      </p>

      {TALENT_BRANCHES.map((branch) => (
        <section key={branch.id} className={styles.branch}>
          <div className={styles.branchHead}>
            <h3 className={styles.branchTitle}>{t(`talent.branch.${branch.id}`)}</h3>
            <p className={styles.branchTip}>{t(`talent.branchTip.${branch.id}`)}</p>
          </div>
          <ul className={styles.list}>
            {branch.nodes.map((node) => (
              <li key={node.id} className={styles.row}>
                <span className={styles.name}>{nameOf(node.id)}</span>
                <span className={styles.desc}>{t(`talent.${node.id}.desc` as TextKey)}</span>
                <button
                  className="btn"
                  disabled={!canAdd(node.id)}
                  onClick={() => setDraft([...draft, node.id])}
                >
                  {t('talent.add')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}