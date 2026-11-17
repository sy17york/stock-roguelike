// Generic modal: overlay, title, close button, Esc to close.
// Modals can stack: Esc and overlay clicks only close the top one.
// Without onClose the modal cannot be dismissed (used for the broken-save dialog).

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../../i18n/useT'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  onClose?: () => void
  size?: 'normal' | 'wide'
  children?: ReactNode
}

// Open closable modals, oldest first. The last one is on top.
const openModals: symbol[] = []

export function Modal({ title, onClose, size = 'normal', children }: ModalProps) {
  const { t } = useT()
  const closeRef = useRef(onClose)
  const closable = onClose !== undefined

  // Always call the latest onClose without re-registering the key listener
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!closable) return
    const id = Symbol('modal')
    openModals.push(id)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === id) closeRef.current?.()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      openModals.splice(openModals.indexOf(id), 1)
    }
  }, [closable])

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.box} ${size === 'wide' ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {onClose && (
            <button className={styles.close} onClick={onClose} aria-label={t('common.close')}>
              ×
            </button>
          )}
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}