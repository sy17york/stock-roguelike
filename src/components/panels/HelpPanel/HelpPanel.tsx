// Help: goal, controls, top bar buttons, rules. All text comes from i18n.

import { TRADING } from '../../../config/trading'
import type { TextKey } from '../../../i18n'
import { useT } from '../../../i18n/useT'
import styles from './HelpPanel.module.css'

const CONTROLS: TextKey[] = ['help.controlComputer', 'help.controlBed']

const BUTTONS: TextKey[] = [
  'help.buttonStats',
  'help.buttonTalents',
  'help.buttonDecor',
  'help.buttonSettings',
  'help.buttonMessages',
  'help.buttonHelp',
]

export function HelpPanel() {
  const { t, percent } = useT()

  const section = (title: TextKey, lines: string[]) => (
    <section className={styles.group}>
      <h3 className={styles.title}>{t(title)}</h3>
      {lines.map((line) => (
        <p key={line} className={styles.row}>
          {line}
        </p>
      ))}
    </section>
  )

  const rules = [
    t('help.ruleStocks'),
    t('help.rulePrice'),
    t('help.ruleFee', { rate: percent(TRADING.feeRate) }),
    t('help.ruleDay'),
    t('help.ruleRefresh'),
    t('help.ruleDataEnd'),
    t('help.ruleTalent'),
    t('help.ruleDecor'),
    t('help.ruleSave'),
  ]

  return (
    <>
      {section('help.goal', [t('help.goalText')])}
      {section('help.controls', CONTROLS.map((k) => t(k)))}
      {section('help.buttons', BUTTONS.map((k) => t(k)))}
      {section('help.rules', rules)}
    </>
  )
}