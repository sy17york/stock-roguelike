// Which panel is open. Only one at a time.

import type { TextKey } from '../i18n'

export type PanelId = 'trade' | 'talents' | 'stats' | 'decor' | 'settings' | 'messages' | 'help'

export const PANEL_TITLE: Record<PanelId, TextKey> = {
  trade: 'trade.title',
  talents: 'talent.title',
  stats: 'stats.title',
  decor: 'decoration.title',
  settings: 'settings.title',
  messages: 'messages.title',
  help: 'help.title',
}