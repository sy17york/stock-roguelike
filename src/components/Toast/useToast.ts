// Hook to show a toast. Provider lives in ToastContext.tsx.

import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error'

export interface ToastValue {
  showToast: (text: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastValue | null>(null)

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside <ToastProvider>')
  return value
}