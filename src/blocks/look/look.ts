import { css, unsafeCSS } from 'lit'
import { choiceProperty, type ChoiceOption, type Property } from '../../core/block/property'

// The look of a block from three choices, declared once here, the same at
// every block: the color, where it shows (the emphasis), and the size. Only
// tokens of mask.css. A block takes the choices it needs as properties and
// sets lookClass on the element that carries its look.

type ToneValue = 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface Tone {
  value: ToneValue
  name: string

  // The mask tokens of a tone: strong for a dot or a full ground, ink for text
  // on the tint, tint for a head, shell for the ground of a column, line for
  // its border, soft behind a chip.
  strong: string
  ink: string
  tint: string
  shell: string
  line: string
  soft: string
}

function tone(value: Exclude<ToneValue, 'accent'>, name: string): Tone {
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

// Petrol is the accent of the mask. It has no tint, shell and line of its
// own and takes them as red does: its soft color, on white.
const ACCENT: Tone = {
  value: 'accent',
  name: 'Petrol',
  strong: '--se-accent',
  ink: '--se-accent-dark',
  tint: '--se-accent-soft',
  shell: '--se-panel',
  line: '--se-accent-soft',
  soft: '--se-accent-soft',
}

const TONES: readonly Tone[] = [
  ACCENT,
  tone('neutral', 'Neutral'),
  tone('info', 'Blau'),
  tone('success', 'Grün'),
  tone('warning', 'Ocker'),
  tone('danger', 'Rot'),
]

const EMPHASES: readonly ChoiceOption[] = [
  { value: 'solid', name: 'Fläche voll' },
  { value: 'soft', name: 'Fläche leicht' },
  { value: 'outline', name: 'Nur Rand' },
  { value: 'text', name: 'Nur Schrift' },
]

// The type size of each size, as mask.css names them small, plain and large.
const SIZES: readonly (ChoiceOption & { font: string })[] = [
  { value: 'small', name: 'Klein', font: '--se-fs-sm' },
  { value: 'normal', name: 'Normal', font: '--se-fs' },
  { value: 'large', name: 'Groß', font: '--se-fs-lg' },
]

export function toneValue(value: string): ToneValue {
  return TONES.some((f) => f.value === value) ? (value as ToneValue) : 'info'
}

type LookInit = Partial<Pick<Property<string>, 'default' | 'label' | 'place' | 'attribute' | 'when'>>

export function toneProperty(init: LookInit = {}): Property<string> {
  const options = TONES.map((f) => ({ value: f.value, name: f.name, color: `var(${f.strong})` }))
  return choiceProperty(options, { default: 'info', label: 'Farbe', attribute: 'tone', ...init })
}

export function emphasisProperty(init: LookInit = {}): Property<string> {
  return choiceProperty(EMPHASES, { default: 'outline', label: 'Art', attribute: 'emphasis', ...init })
}

export function sizeProperty(init: LookInit = {}): Property<string> {
  return choiceProperty(SIZES.map(({ value, name }) => ({ value, name })),
    { default: 'normal', label: 'Größe', attribute: 'size', ...init })
}

// A block without the size, like an area, leaves it out.
export function lookClass(look: { tone: string; emphasis: string; size?: string }): string {
  const colored = `tone-${toneValue(look.tone)} emphasis-${look.emphasis}`
  return look.size === undefined ? colored : `${colored} size-${look.size}`
}

// A tone sets its tokens, a size its type. An emphasis says where the color
// shows: Fläche voll the strong ground under white type, Fläche leicht the
// soft ground under the ink, Nur Rand the line around dark type, Nur Schrift
// the ink alone. Under the pointer the ground darkens or takes the soft color,
// the line the strong one.
export const lookStyle = css`
  ${unsafeCSS(TONES
    .map((f) => `.tone-${f.value} {`
      + ` --tone-strong: var(${f.strong}); --tone-ink: var(${f.ink}); --tone-tint: var(${f.tint});`
      + ` --tone-shell: var(${f.shell}); --tone-line: var(${f.line}); --tone-soft: var(${f.soft}); }`)
    .join('\n  '))}
  ${unsafeCSS(SIZES.map((s) => `.size-${s.value} { --look-fs: var(${s.font}); }`).join('\n  '))}

  .emphasis-solid {
    --look-ground: var(--tone-strong); --look-edge: var(--tone-strong); --look-ink: var(--se-panel);
    --look-ground-hover: var(--tone-ink); --look-edge-hover: var(--tone-ink);
  }
  .emphasis-soft {
    --look-ground: var(--tone-soft); --look-edge: transparent; --look-ink: var(--tone-ink);
    --look-ground-hover: var(--tone-soft); --look-edge-hover: var(--tone-strong);
  }
  .emphasis-outline {
    --look-ground: var(--se-panel); --look-edge: var(--tone-line); --look-ink: var(--se-ink);
    --look-ground-hover: var(--tone-soft); --look-edge-hover: var(--tone-strong);
  }
  .emphasis-text {
    --look-ground: transparent; --look-edge: transparent; --look-ink: var(--tone-ink);
    --look-ground-hover: var(--tone-soft); --look-edge-hover: transparent;
  }
`
