import type { ChoiceOption } from './property'

export type ToneValue = 'info' | 'success' | 'warning' | 'danger'

export interface Tone {
  value: ToneValue
  name: string

  strong: string
  soft: string
}

export const TONES: readonly Tone[] = [
  { value: 'info', name: 'Hinweis', strong: '--se-blue', soft: '--se-blue-soft' },
  { value: 'success', name: 'Erfolg', strong: '--se-green', soft: '--se-green-soft' },
  { value: 'warning', name: 'Warnung', strong: '--se-amber', soft: '--se-amber-soft' },
  { value: 'danger', name: 'Fehler', strong: '--se-red', soft: '--se-red-soft' },
]

export function toneValue(value: string): ToneValue {
  return TONES.some((f) => f.value === value) ? (value as ToneValue) : 'info'
}

export function toneOptions(): ChoiceOption[] {
  return TONES.map((f) => ({ value: f.value, name: f.name, color: `var(${f.strong})` }))
}
