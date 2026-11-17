import { useCallback, useEffect, useState } from 'react'
import { DecorPanel } from './components/panels/DecorPanel/DecorPanel'
import { HelpPanel } from './components/panels/HelpPanel/HelpPanel'
import { MessagesPanel } from './components/panels/MessagesPanel/MessagesPanel'
import { Modal } from './components/Modal/Modal'
import { PANEL_TITLE } from './components/panels'
import type { PanelId } from './components/panels'
import { SettingsPanel } from './components/panels/SettingsPanel/SettingsPanel'
import { TalentPanel } from './components/panels/TalentPanel/TalentPanel'
import { TradePanel } from './components/panels/TradePanel/TradePanel'
import { Room } from './components/Room/Room'
import { TopBar } from './components/TopBar/TopBar'
import { useToast } from './components/Toast/useToast'
import { useT } from './i18n/useT'
import { useGame } from './state/useGame'
import { StatsPanel } from './components/panels/StatsPanel/StatsPanel'

export default function App() {
  const { state, dispatch, brokenSave, acknowledgeBrokenSave } = useGame()
  const { t } = useT()
  const { showToast } = useToast()
  const [panel, setPanel] = useState<PanelId | null>(null)
  const { colorScheme, language } = state.settings

  // Settings that live on <html>: price colors and language
  useEffect(() => {
    document.documentElement.dataset.colorScheme = colorScheme
    document.documentElement.lang = language
  }, [colorScheme, language])

  const open = useCallback(
    (id: PanelId) => {
      if (id === 'messages') dispatch({ type: 'markMessagesRead' })
      setPanel(id)
    },
    [dispatch],
  )
  const close = useCallback(() => setPanel(null), [])

  const sleep = useCallback(() => {
    dispatch({ type: 'sleep' })
    showToast(t('room.slept', { day: state.run.day + 1 }))
  }, [dispatch, showToast, t, state.run.day])

  return (
    <>
      <TopBar onOpen={open} />
      <Room onComputer={() => open('trade')} onBed={sleep} />

      {panel && (
        <Modal
          title={t(PANEL_TITLE[panel])}
          size={panel === 'trade' ? 'wide' : 'normal'}
          onClose={close}
        >
          {panel === 'help' && <HelpPanel />}
          {panel === 'trade' && <TradePanel />}
          {panel === 'decor' && <DecorPanel />}
          {panel === 'talents' && <TalentPanel />}
          {panel === 'settings' && <SettingsPanel onClose={close} />}
          {panel === 'messages' && <MessagesPanel />}
          {panel === 'stats' && <StatsPanel />}
        </Modal>
      )}

      {brokenSave && (
        <Modal title={t('dialog.brokenSaveTitle')}>
          <p>{t('dialog.brokenSaveBody')}</p>
          <button className="btn btn-accent" onClick={acknowledgeBrokenSave}>
            {t('dialog.startNew')}
          </button>
        </Modal>
      )}
    </>
  )
}