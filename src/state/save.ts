// Save, load, export, import. One save only, always overwritten.
// Slots are stored as ids and re-cut from the database on load.

import { ACCESSORIES, FURNITURE_IDS } from '../config/decorations'
import { GAME } from '../config/game'
import { TALENT_IDS, TALENT_RULES } from '../config/talents'
import { getDataVersion } from '../data/history'
import { getSeriesAt } from '../core/sampling'
import type { RunState, SaveData, SavedRun, Settings, Slot } from '../core/types'
import { DEFAULT_SETTINGS } from './newRun'

export const SAVE_KEY = 'stock-roguelike-save'
// Version 4: trade log removed, messages are system messages only
export const SAVE_VERSION = 4

export type LoadError = 'invalidSave' | 'incompatibleSave'

export type LoadResult =
  | { ok: true; save: SaveData; run: RunState }
  | { ok: false; reason: LoadError }

// ---------- Run <-> save ----------

export function serialize(settings: Settings, run: RunState): SaveData {
  const savedRun: SavedRun = {
    ...run,
    slots: run.slots.map((s) => ({
      stockId: s.series.stockId,
      startIndex: s.series.startIndex,
      daysElapsed: s.cursor - GAME.initialCursor,
    })),
  }
  return { version: SAVE_VERSION, dataVersion: getDataVersion(), settings, run: savedRun }
}

// Rebuild the full run. Fails if any stock or range no longer exists in the data.
function hydrate(saved: SavedRun): RunState | undefined {
  const slots: Slot[] = []
  for (const s of saved.slots) {
    const series = getSeriesAt(s.stockId, s.startIndex)
    const cursor = GAME.initialCursor + s.daysElapsed
    const validDays =
      Number.isInteger(s.daysElapsed) && s.daysElapsed >= 0 && cursor <= GAME.seriesLength - 1
    if (!series || !validDays) return undefined
    slots.push({ series, cursor })
  }
  return { ...saved, slots }
}

// ---------- Validation (light format check, not anti-cheat) ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const accessoryIds = new Set<string>(ACCESSORIES.map((a) => a.id))

function isDecor(d: unknown): boolean {
  if (!isRecord(d) || !isRecord(d.variants) || !Array.isArray(d.accessories)) return false
  const variants = d.variants
  return (
    FURNITURE_IDS.every((f) => variants[f] === 'old' || variants[f] === 'new') &&
    d.accessories.every((id) => typeof id === 'string' && accessoryIds.has(id))
  )
}

function isTalents(t: unknown): boolean {
  if (!isRecord(t) || !Array.isArray(t.equipped)) return false
  return (
    t.equipped.length <= TALENT_RULES.maxEquipped &&
    new Set(t.equipped).size === t.equipped.length &&
    t.equipped.every((id) => typeof id === 'string' && TALENT_IDS.includes(id)) &&
    (t.lastConfirmDay === null || typeof t.lastConfirmDay === 'number')
  )
}

function isMessages(m: unknown): boolean {
  return (
    isRecord(m) &&
    typeof m.unread === 'boolean' &&
    Array.isArray(m.system) &&
    m.system.every(
      (s) => isRecord(s) && typeof s.day === 'number' && s.type === 'delisted' && isRecord(s.params),
    )
  )
}

function isSavedRun(r: unknown): r is SavedRun {
  if (!isRecord(r)) return false
  return (
    typeof r.day === 'number' &&
    typeof r.cash === 'number' &&
    typeof r.rngSeed === 'number' &&
    Array.isArray(r.slots) &&
    r.slots.length === GAME.stocksPerDay &&
    r.slots.every(
      (s) =>
        isRecord(s) &&
        typeof s.stockId === 'string' &&
        typeof s.startIndex === 'number' &&
        typeof s.daysElapsed === 'number',
    ) &&
    Array.isArray(r.positions) &&
    r.positions.every(
      (p) =>
        isRecord(p) &&
        Number.isInteger(p.slotIndex) &&
        (p.slotIndex as number) >= 0 &&
        (p.slotIndex as number) < GAME.stocksPerDay &&
        Number.isInteger(p.quantity) &&
        (p.quantity as number) >= 1 &&
        typeof p.avgPrice === 'number' &&
        typeof p.openedOnDay === 'number',
    ) &&
    isTalents(r.talents) &&
    isDecor(r.decor) &&
    isMessages(r.messages) &&
    isRecord(r.stats)
  )
}

export function parseSave(data: unknown): LoadResult {
  if (!isRecord(data) || typeof data.version !== 'number' || !isRecord(data.settings)) {
    return { ok: false, reason: 'invalidSave' }
  }
  if (data.version !== SAVE_VERSION || data.dataVersion !== getDataVersion()) {
    return { ok: false, reason: 'incompatibleSave' }
  }
  if (!isSavedRun(data.run)) return { ok: false, reason: 'invalidSave' }

  const run = hydrate(data.run)
  if (!run) return { ok: false, reason: 'incompatibleSave' }

  const settings: Settings = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<Settings>) }
  return { ok: true, save: { ...(data as unknown as SaveData), settings }, run }
}

// ---------- Export / import (Base64 of JSON; the content is plain ASCII) ----------

export function encodeSave(save: SaveData): string {
  return btoa(JSON.stringify(save))
}

export function decodeSave(text: string): LoadResult {
  try {
    return parseSave(JSON.parse(atob(text.trim())))
  } catch {
    return { ok: false, reason: 'invalidSave' }
  }
}

// ---------- localStorage ----------

export function writeSave(save: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    return true
  } catch {
    return false // storage full or blocked
  }
}

// Never deletes anything. A broken save stays on disk until the player starts over.
export function loadSave(): LoadResult | { ok: false; reason: 'noSave' } {
  try {
    const text = localStorage.getItem(SAVE_KEY)
    if (text === null) return { ok: false, reason: 'noSave' }
    return parseSave(JSON.parse(text))
  } catch {
    return { ok: false, reason: 'invalidSave' }
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}