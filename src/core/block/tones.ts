import type { ChoiceOption } from './property'

type ToneValue = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface Tone {
  value: ToneValue
  name: string

  // The mask tokens of a tone: strong for a dot, ink for text on the tint,
  // tint for a head, shell for the ground of a column, line for its border,
  // soft behind a chip.
  strong: string
  ink: string
  tint: string
  shell: string
  line: string
  soft: string
}

function tone(value: ToneValue, name: string): Tone {
  const token = `--se-${value}`
  return {
    value,
    name,
    strong: token,
    ink: `${token}-ink`,
    tint: `${token}-tint`,
    shell: `${token}-shell`,
    line: `${token}-line`,
    soft: `${token}-soft`,
  }
}

export const TONES: readonly Tone[] = [
  tone('neutral', 'Neutral'),
  tone('info', 'Hinweis'),
  tone('success', 'Erfolg'),
  tone('warning', 'Warnung'),
  tone('danger', 'Fehler'),
]

export function toneValue(value: string): ToneValue {
  return TONES.some((f) => f.value === value) ? (value as ToneValue) : 'info'
}

export function toneOptions(): ChoiceOption[] {
  return TONES.map((f) => ({ value: f.value, name: f.name, color: `var(${f.strong})` }))
}
