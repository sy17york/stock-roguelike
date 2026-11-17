// Toast provider: one message at the bottom center, gone after 3 seconds.
// Also shows every game error (state.lastError) so each screen does not have to.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'
import { useGame } from '../../state/useGame'
import styles from './Toast.module.css'
import { ToastContext } from './useToast'
import type { ToastKind } from './useToast'

const DURATION_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
  const { state } = useGame()
  const { t } = useT()
  const [toast, setToast] = useState<{ text: string; kind: ToastKind; id: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const counter = useRef(0)

  const showToast = useCallback((text: string, kind: ToastKind = 'success') => {
    window.clearTimeout(timer.current)
    counter.current += 1
    setToast({ text, kind, id: counter.current })
    timer.current = window.setTimeout(() => setToast(null), DURATION_MS)
  }, [])

  // errorSeq increases on every failure, so a repeated error shows again
  const { lastError, errorSeq } = state
  useEffect(() => {
    if (errorSeq > 0 && lastError) showToast(t(`errors.${lastError}`), 'error')
    // Only react to a new failure, not to a language change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorSeq])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.kind === 'error' ? styles.error : styles.success}`}
          role="status"
        >
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  )
}