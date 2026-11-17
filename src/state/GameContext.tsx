// Provider: startup load, reducer, auto-save.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { detectLanguage } from '../i18n'
import { DEFAULT_SETTINGS } from './newRun'
import { createInitialGameState, gameReducer } from './reducer'
import type { GameState } from './reducer'
import { loadSave, serialize, writeSave } from './save'
import type { LoadError } from './save'
import { GameContext } from './useGame'

interface Boot {
  state: GameState
  brokenSave: LoadError | null
}

// Runs once at startup.
function boot(): Boot {
  const seed = Date.now()
  const loaded = loadSave()

  if (loaded.ok) {
    return {
      state: { settings: loaded.save.settings, run: loaded.run, lastError: null, errorSeq: 0 },
      brokenSave: null,
    }
  }

  const settings = { ...DEFAULT_SETTINGS, language: detectLanguage() }
  const state = createInitialGameState(seed, settings)

  if (loaded.reason === 'noSave') return { state, brokenSave: null }
  return { state, brokenSave: loaded.reason }
}

export function GameProvider({ children }: { children: ReactNode }) {
  // useState initializer runs once, so boot() reads storage only once
  const [initial] = useState(boot)
  const [state, dispatch] = useReducer(gameReducer, initial.state)
  const [brokenSave, setBrokenSave] = useState<LoadError | null>(initial.brokenSave)

  // Auto-save whenever the run or settings change. Paused while the old save is broken.
  const firstRender = useRef(true)
  useEffect(() => {
    if (brokenSave) return
    // Skip nothing on first render: a brand new game should create the save right away
    firstRender.current = false
    const ok = writeSave(serialize(state.settings, state.run))
    if (!ok) console.warn('Could not write the save (storage full or blocked).')
  }, [state.run, state.settings, brokenSave])

  const acknowledgeBrokenSave = useCallback(() => {
    dispatch({ type: 'newRun', seed: Date.now() })
    setBrokenSave(null) // saving resumes and overwrites the old save
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, brokenSave, acknowledgeBrokenSave }),
    [state, brokenSave, acknowledgeBrokenSave],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}