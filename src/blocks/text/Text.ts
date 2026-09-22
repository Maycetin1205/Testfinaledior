import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { BlockElement } from '../base/BlockElement'
import type { Category } from '../../core/block/blockClass'
import {
  choiceProperty,
  fieldProperty,
  numberProperty,
  segmentProperty,
  sourceProperty,
  textProperty,
} from '../../core/block/property'
import { bindable, bindingAttr, type Capability } from '../../core/block/capability'
import { TONES, toneOptions } from '../../core/block/tones'
import { readBoundSpot } from '../behavior/boundSpot'
import { makeDataLink, sourceIdOf } from '../behavior/source'
import { textStyle } from './textStyle'

const SIZE_MIN = 6
const SIZE_MAX = 96
const SIZE_STANDARD = 14

const WEIGHTS = { thin: '300', normal: '400', bold: '700' } as const
type Weight = keyof typeof WEIGHTS
const ALIGNS = { left: 'left', center: 'center', right: 'right' } as const
type Align = keyof typeof ALIGNS

const NEUTRAL_COLORS: readonly { value: string; name: string; token: string }[] = [
  { value: 'standard', name: 'Standard', token: '--se-ink' },
  { value: 'gedaempft', name: 'Gedämpft', token: '--se-muted' },
  { value: 'accent', name: 'Akzent', token: '--se-accent' },
]
const COLORS: Record<string, string> = {
  ...Object.fromEntries(NEUTRAL_COLORS.map((f) => [f.value, `var(${f.token})`])),
  ...Object.fromEntries(TONES.map((f) => [f.value, `var(${f.strong})`])),
}
const COLOR_STANDARD = 'standard'

const TEXT_BINDING = bindingAttr('text')

function sizeOf(v: unknown): number {
  if (v === 'ueberschrift') return 15
  if (v === 'klein') return 12
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
  if (!Number.isFinite(n)) return SIZE_STANDARD
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, n))
}

function weightOf(v: unknown): Weight {
  return typeof v === 'string' && v in WEIGHTS ? (v as Weight) : 'normal'
}

function alignOf(v: unknown): Align {
  return typeof v === 'string' && v in ALIGNS ? (v as Align) : 'left'
}

function colorOf(v: unknown): string {
  return typeof v === 'string' && v in COLORS ? v : COLOR_STANDARD
}

export class Text extends BlockElement {
  static readonly type = 'text'
  static readonly tag = 'ff-text'
  static readonly displayName = 'Text'
  static readonly category: Category = 'display'

  static readonly capabilities: readonly Capability[] = [
    { kind: 'source' },
    { kind: 'followsSelection' },
    bindable<typeof Text.blockProperties>([{ prop: 'text', name: 'Text' }]),
  ]

  static readonly grid = { startWidth: 12, startHeight: 2, minWidth: 2, minHeight: 1 }

  static readonly blockProperties = {
    size: numberProperty({
      default: SIZE_STANDARD,
      label: 'Größe',
      help: 'Schriftgröße in Pixeln.',
      attribute: 'size',
      unit: 'px',
      min: SIZE_MIN,
      max: SIZE_MAX,
      row: 'Text-Stil',
    }),
    weight: segmentProperty([
      { value: 'thin', name: 'Dünn' },
      { value: 'normal', name: 'Normal' },
      { value: 'bold', name: 'Fett' },
    ], {
      default: 'normal',
      label: 'Gewicht',
      help: 'Strichstärke der Schrift.',
      attribute: 'weight',
      row: 'Text-Stil',
    }),
    align: segmentProperty([
      { value: 'left', name: 'Links' },
      { value: 'center', name: 'Mitte' },
      { value: 'right', name: 'Rechts' },
    ], {
      default: 'left',
      label: 'Ausrichtung',
      help: 'Wo der Text in seiner Breite sitzt.',
      attribute: 'align',
      row: 'Text-Stil',
    }),
    color: choiceProperty([
      ...NEUTRAL_COLORS.map((f) => ({ value: f.value, name: f.name, color: `var(${f.token})` })),
      ...toneOptions(),
    ], {
      default: COLOR_STANDARD,
      label: 'Farbe',
      help: 'Textfarbe aus den Farben der Maske.',
      attribute: 'color',
    }),
    text: textProperty({
      default: 'Text',
      label: 'Text',
      help: 'Was der Baustein zeigt, solange kein Feld gebunden ist.',
      place: 'block',
      attribute: 'text',
    }),
    source: sourceProperty({
      default: '',
      label: 'Datenquelle',
      help: 'Die Quelle, aus der der Text sein Feld liest.',
      place: 'none',
      attribute: 'source',
    }),
    textField: fieldProperty({
      default: '',
      label: 'Textfeld',
      help: 'Das Feld, dessen Wert der Baustein zeigt.',
      place: 'none',
      attribute: 'textfield',
    }),
  }

  static override styles: CSSResultGroup = [BlockElement.styles, textStyle]

  size: number = SIZE_STANDARD

  weight = 'normal'

  align = 'left'

  color = COLOR_STANDARD

  text = 'Text'

  source = ''

  textField = ''

  override render(): TemplateResult {
    const style = {
      fontSize: `${sizeOf(this.size)}px`,
      fontWeight: WEIGHTS[weightOf(this.weight)],
      textAlign: ALIGNS[alignOf(this.align)],
      color: COLORS[colorOf(this.color)],
    }

    return html`<div
      class="text"
      style=${styleMap(style)}
      data-ff-editable
      data-ff-spot="text"
      ?data-ff-bound=${this.textField !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'text')}
    >${this.text}</div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    link.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    link.disconnect(this)
  }
}

const link = makeDataLink<Text>({
  hydrate: (el) => {
    const spot = readBoundSpot(el, TEXT_BINDING)
    if (spot.kind === 'ungebunden') return
    el.text = spot.kind === 'value' ? spot.value : ''
  },
  wire: (el) => {
    if (sourceIdOf(el) !== '' && el.getAttribute(TEXT_BINDING)) el.text = ''
  },
})

BlockElement.defineAndRegister(Text)
