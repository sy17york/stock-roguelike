// Game reducer: turns player actions into new game state.
// Pure. Errors are stored as reason codes; the UI translates them.

import type { FurnitureId, Variant } from '../config/decorations'
import { advanceDay, refreshSlots } from '../core/market'
import { applyBuy, applySell } from '../core/trading'
import type { TradeError } from '../core/trading'
import type { RunState, Settings } from '../core/types'
import { setVariant, syncRunDecor, toggleAccessory } from './decor'
import type { DecorError, DecorResult } from './decor'
import { createNewRun, DEFAULT_SETTINGS } from './newRun'
import { decodeSave } from './save'
import type { LoadError } from './save'
import { confirmTalents } from './talents'
import type { TalentError } from './talents'

export type GameError =
  | TradeError
  | TalentError
  | DecorError
  | LoadError
  | 'alreadyRefreshed'

export interface GameState {
  settings: Settings
  run: RunState
  // Last failure (null after any success). errorSeq increases on every failure,
  // so the UI can pop up again even when the same error repeats.
  lastError: GameError | null
  errorSeq: number
}

export type GameAction =
  | { type: 'buy'; slotIndex: number; quantity: number }
  | { type: 'sell'; slotIndex: number; quantity: number }
  | { type: 'sleep' }
  | { type: 'refresh' }
  | { type: 'confirmTalents'; ids: string[] }
  | { type: 'setVariant'; furniture: FurnitureId; variant: Variant }
  | { type: 'toggleAccessory'; id: string }
  | { type: 'markMessagesRead' }
  | { type: 'newRun'; seed: number }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'importSave'; text: string }

export function createInitialGameState(
  seed: number,
  settings: Settings = DEFAULT_SETTINGS,
): GameState {
  return { settings, run: createNewRun(seed), lastError: null, errorSeq: 0 }
}

function fail(state: GameState, reason: GameError): GameState {
  return { ...state, lastError: reason, errorSeq: state.errorSeq + 1 }
}

function succeed(state: GameState, run: RunState): GameState {
  return { ...state, run, lastError: null }
}


function applyDecorResult(state: GameState, result: DecorResult): GameState {
  if (!result.ok) return fail(state, result.reason)
  return succeed(state, { ...state.run, decor: result.decor })
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const { run } = state

  switch (action.type) {
    case 'buy': {
      const result = applyBuy(run, action.slotIndex, action.quantity)
      return result.ok ? succeed(state, result.run) : fail(state, result.reason)
    }
    case 'sell': {
      const result = applySell(run, action.slotIndex, action.quantity)
      // A sell can raise peak cash: switch on newly unlocked accessories
      return result.ok ? succeed(state, syncRunDecor(run, result.run)) : fail(state, result.reason)
    }
    case 'sleep':
      // A forced sell on data exhaustion can raise peak cash
      return succeed(state, syncRunDecor(run, advanceDay(run)))
    
    case 'refresh': {
      const result = refreshSlots(run)
      return result.ok ? succeed(state, result.run) : fail(state, result.reason)
    }
    case 'confirmTalents': {
      const result = confirmTalents(run.talents, action.ids, run.day)
      return result.ok
        ? succeed(state, { ...run, talents: result.talents })
        : fail(state, result.reason)
    }
    case 'setVariant':
      return applyDecorResult(
        state,
        setVariant(run.decor, action.furniture, action.variant, run.stats.peakCash),
      )
    case 'toggleAccessory':
      return applyDecorResult(state, toggleAccessory(run.decor, action.id, run.stats.peakCash))
    case 'markMessagesRead':
      return succeed(state, { ...run, messages: { ...run.messages, unread: false } })
    case 'newRun':
      // Settings are kept
      return succeed(state, createNewRun(action.seed))
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'importSave': {
      const result = decodeSave(action.text)
      // Import replaces the run only; current settings are kept
      return result.ok ? succeed(state, result.run) : fail(state, result.reason)
    }
  }
}