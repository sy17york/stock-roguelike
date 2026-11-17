// Settings: choice rows, export / import, start over (with a confirm dialog).
// Language, colors, sound and number format apply immediately and are auto-saved.

import { useState } from 'react'
import { LANGUAGES } from '../../../i18n'
import type { TextKey } from '../../../i18n'
import { useT } from '../../../i18n/useT'
import { decodeSave, encodeSave, serialize } from '../../../state/save'
import { useGame } from '../../../state/useGame'
import type { Settings } from '../../../core/types'
import { Modal } from '../../Modal/Modal'
import { useToast } from '../../Toast/useToast'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  onClose: () => void
}

interface Choice {
  value: string
  label: string
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { state, dispatch } = useGame()
  const { t } = useT()
  const { showToast } = useToast()
  const { settings, run } = state

  const [importText, setImportText] = useState('')
  const [confirmingNewRun, setConfirmingNewRun] = useState(false)

  const set = (patch: Partial<Settings>) => dispatch({ type: 'updateSettings', patch })

  // One row: a label and a group of option buttons. The selected one is highlighted.
  const choiceRow = (label: TextKey, current: string, choices: Choice[], onPick: (v: string) => void) => (
    <div className={styles.row}>
      <span className={styles.label}>{t(label)}</span>
      <div className={styles.choices}>
        {choices.map((c) => (
          <button
            key={c.value}
            className={`btn ${current === c.value ? 'btn-accent' : ''}`}
            onClick={() => onPick(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )

  const exportSave = async () => {
    try {
      await navigator.clipboard.writeText(encodeSave(serialize(settings, run)))
      showToast(t('settings.copied'))
    } catch {
      showToast(t('settings.exportFailed'), 'error')
    }
  }

  const importSave = () => {
    const text = importText.trim()
    if (!text) return
    // Check first so we can show a success toast; failures are shown by the global error toast
    const ok = decodeSave(text).ok
    dispatch({ type: 'importSave', text })
    if (ok) {
      showToast(t('settings.imported'))
      setImportText('')
    }
  }

  const startOver = () => {
    dispatch({ type: 'newRun', seed: Date.now() })
    setConfirmingNewRun(false)
    onClose()
  }

  return (
    <>
      {choiceRow(
        'settings.language',
        settings.language,
        LANGUAGES.map((l) => ({ value: l.id, label: l.label })),
        (v) => set({ language: v as Settings['language'] }),
      )}
      {choiceRow(
        'settings.colorScheme',
        settings.colorScheme,
        [
          { value: 'greenUp', label: t('settings.greenUp') },
          { value: 'redUp', label: t('settings.redUp') },
        ],
        (v) => set({ colorScheme: v as Settings['colorScheme'] }),
      )}
      {choiceRow(
        'settings.sound',
        settings.soundOn ? 'on' : 'off',
        [
          { value: 'on', label: t('common.on') },
          { value: 'off', label: t('common.off') },
        ],
        (v) => set({ soundOn: v === 'on' }),
      )}
      {choiceRow(
        'settings.numberFormat',
        settings.numberFormat,
        [
          { value: 'full', label: t('settings.full') },
          { value: 'compact', label: t('settings.compact') },
        ],
        (v) => set({ numberFormat: v as Settings['numberFormat'] }),
      )}

      <hr className={styles.line} />

      <div className={styles.row}>
        <span className={styles.label}>{t('settings.export')}</span>
        <button className="btn" onClick={exportSave}>
          {t('settings.export')}
        </button>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t('settings.import')}</span>
        <div className={styles.importBox}>
          <input
            className={styles.field}
            value={importText}
            placeholder={t('settings.importHint')}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button className="btn" disabled={importText.trim() === ''} onClick={importSave}>
            {t('settings.import')}
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t('settings.newRun')}</span>
        <button className="btn" onClick={() => setConfirmingNewRun(true)}>
          {t('settings.newRun')}
        </button>
      </div>

      {confirmingNewRun && (
        <Modal title={t('dialog.newRunTitle')} onClose={() => setConfirmingNewRun(false)}>
          <p>{t('dialog.newRunBody')}</p>
          <div className={styles.confirmActions}>
            <button className="btn" onClick={() => setConfirmingNewRun(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-accent" onClick={startOver}>
              {t('common.confirm')}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}