// Talent rules. Pure functions. The draft list lives in the panel, not here.

import { TALENT_IDS, TALENT_RULES } from '../config/talents'
import type { TalentState } from '../core/types'

export type TalentError =
  | 'unknownTalent'
  | 'emptySelection'
  | 'tooManyTalents'
  | 'duplicateTalent'
  | 'alreadyConfirmedToday'

export type TalentResult =
  | { ok: true; talents: TalentState }
  | { ok: false; reason: TalentError }

export function createDefaultTalents(): TalentState {
  return { equipped: [], lastConfirmDay: null }
}

export function hasConfirmedToday(talents: TalentState, day: number): boolean {
  return talents.lastConfirmDay === day
}

// Red dot on the talent button: fewer than the maximum are active
export function needsTalentAttention(talents: TalentState): boolean {
  return talents.equipped.length < TALENT_RULES.maxEquipped
}

// Replace the active talents with the draft. Takes effect immediately.
export function confirmTalents(talents: TalentState, draft: string[], day: number): TalentResult {
  if (hasConfirmedToday(talents, day)) return { ok: false, reason: 'alreadyConfirmedToday' }
  if (draft.length === 0) return { ok: false, reason: 'emptySelection' }
  if (draft.length > TALENT_RULES.maxEquipped) return { ok: false, reason: 'tooManyTalents' }
  if (new Set(draft).size !== draft.length) return { ok: false, reason: 'duplicateTalent' }
  if (!draft.every((id) => TALENT_IDS.includes(id))) return { ok: false, reason: 'unknownTalent' }
  return { ok: true, talents: { equipped: [...draft], lastConfirmDay: day } }
}