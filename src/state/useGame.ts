// Hook to read the game state. Context object lives in GameContext.tsx.

import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { GameAction, GameState } from './reducer'
import type { LoadError } from './save'

export interface GameContextValue {
  state: GameState
  dispatch: Dispatch<GameAction>
  // Set when the save on disk could not be loaded. Auto-save is paused while set.
  brokenSave: LoadError | null
  // Player chose to start over after a broken save: clears the flag, resumes saving.
  acknowledgeBrokenSave: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside <GameProvider>')
  return value
}