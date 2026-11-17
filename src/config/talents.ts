// Talents: 15 indicators in 3 categories. All are available from the start.
// Only ids live here. Display text lives in i18n.

export type TalentBranchId = 'ma' | 'momentum' | 'volume'

export interface TalentBranch {
  id: TalentBranchId
  nodes: { id: string }[] // order is only the display order
}

export const TALENT_BRANCHES: TalentBranch[] = [
  {
    id: 'ma',
    nodes: [{ id: 'ma5' }, { id: 'ma10' }, { id: 'ma20' }, { id: 'ma60' }, { id: 'ma200' }],
  },
  {
    id: 'momentum',
    nodes: [{ id: 'rsi14' }, { id: 'rsi7_21' }, { id: 'macd' }, { id: 'kdj' }, { id: 'boll' }],
  },
  {
    id: 'volume',
    nodes: [
      { id: 'vol' },
      { id: 'volMa' },
      { id: 'atr' },
      { id: 'obv' },
      { id: 'supportResistance' },
    ],
  },
]

export const TALENT_IDS: string[] = TALENT_BRANCHES.flatMap((b) => b.nodes.map((n) => n.id))

export const TALENT_RULES = {
  // Max talents that can be active at once
  maxEquipped: 3,
} as const