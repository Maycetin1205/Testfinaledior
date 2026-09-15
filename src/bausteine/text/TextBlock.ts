// Baustein Text: eine Zeile Text, frei getippt oder an ein Feld gebunden.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import { bindbar, type Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { FARBWELTEN, farbweltOptionen } from '../shared/statusVariant'
import { connectText, disconnectText } from './seRuntime'

const GROESSE_MIN = 6
const GROESSE_MAX = 96
const GROESSE_STANDARD = 14

const GEWICHTE = { duenn: '300', normal: '400', fett: '700' } as const
type Gewicht = keyof typeof GEWICHTE
const AUSRICHTUNGEN = { links: 'left', mitte: 'center', rechts: 'right' } as const
type Ausrichtung = keyof typeof AUSRICHTUNGEN

// Drei neutrale Toene, dann die Farbwelten der Maske: eigene Farbnamen
// erfindet der Text nicht.
const NEUTRALE_FARBEN: readonly { wert: string; name: string; token: string }[] = [
  { wert: 'standard', name: 'Standard', token: '--se-ink' },
  { wert: 'gedaempft', name: 'Gedämpft', token: '--se-muted' },
  { wert: 'akzent', name: 'Akzent', token: '--se-accent' },
]
const FARBEN: Record<string, string> = {
  ...Object.fromEntries(NEUTRALE_FARBEN.map((f) => [f.wert, `var(${f.token})`])),
  ...Object.fromEntries(FARBWELTEN.map((f) => [f.wert, `var(${f.stark})`])),
}
const FARBE_STANDARD = 'standard'

function coerceGroesse(v: unknown): number {
  if (v === 'ueberschrift') return 15
  if (v === 'klein') return 12
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
  if (!Number.isFinite(n)) return GROESSE_STANDARD
  return Math.min(GROESSE_MAX, Math.max(GROESSE_MIN, n))
}

function coerceGewicht(v: unknown): Gewicht {
  return typeof v === 'string' && v in GEWICHTE ? (v as Gewicht) : 'normal'
}

function coerceAusrichtung(v: unknown): Ausrichtung {
  return typeof v === 'string' && v in AUSRICHTUNGEN ? (v as Ausrichtung) : 'links'
}

function coerceFarbe(v: unknown): string {
  return typeof v === 'string' && v in FARBEN ? v : FARBE_STANDARD
}

export class TextBlock extends Grundbaustein {
  static readonly blockType = 'text'
  static readonly tagName = 'ff-text'
  static readonly displayName = 'Text'
  static readonly category: Kategorie = 'anzeige'
  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'auswahlFolgen' },
    bindbar<typeof TextBlock.defaultProps>([{ prop: 'text', label: 'Text' }]),
  ]

  static readonly defaultProps = {
    width: 'fill',
    groesse: GROESSE_STANDARD,
    gewicht: 'normal',
    ausrichtung: 'links',
    farbe: FARBE_STANDARD,
    text: 'Text',

    source: '',
    textField: '',
  }

  static readonly raster = { startW: 12, startH: 2, minW: 2, minH: 1 }

  static override readonly customProperties: Eigenschaft[] = [
    {
      attributeName: 'groesse',
      name: 'Größe',
      description: 'Schriftgröße in Pixeln.',      kind: 'number',
      unit: 'px',
      min: GROESSE_MIN,
      max: GROESSE_MAX,
      inspectorRow: 'Text-Stil',
    },
    {
      attributeName: 'gewicht',
      name: 'Gewicht',
      description: 'Strichstärke der Schrift.',      kind: 'segment',
      options: [
        { value: 'duenn', label: 'Dünn' },
        { value: 'normal', label: 'Normal' },
        { value: 'fett', label: 'Fett' },
      ],
      inspectorRow: 'Text-Stil',
    },
    {
      attributeName: 'ausrichtung',
      name: 'Ausrichtung',
      description: 'Wo der Text in seiner Breite sitzt.',      kind: 'segment',
      options: [
        { value: 'links', label: 'Links' },
        { value: 'mitte', label: 'Mitte' },
        { value: 'rechts', label: 'Rechts' },
      ],
      inspectorRow: 'Text-Stil',
    },

    {
      attributeName: 'farbe',
      name: 'Farbe',
      description: 'Textfarbe aus den Farben der Maske.',      kind: 'select',
      options: [
        ...NEUTRALE_FARBEN.map((f) => ({ value: f.wert, label: f.name, farbe: `var(${f.token})` })),
        ...farbweltOptionen(),
      ],
    },
  ]

  static override styles = [
    Grundbaustein.styles,
    css`
      .text {
        font-family: var(--se-font);

        --text-zeilenhoehe: var(--se-lh);
        line-height: var(--text-zeilenhoehe);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .text:empty { min-height: calc(1em * var(--text-zeilenhoehe)); }
    `,
  ]

  @property({ type: Number }) groesse: number = GROESSE_STANDARD
  @property() gewicht = 'normal'
  @property() ausrichtung = 'links'
  @property() farbe = FARBE_STANDARD
  @property() text = 'Text'
  @property() source = ''
  @property() textField = ''

  override render(): TemplateResult {
    const stil = {
      fontSize: `${coerceGroesse(this.groesse)}px`,
      fontWeight: GEWICHTE[coerceGewicht(this.gewicht)],
      textAlign: AUSRICHTUNGEN[coerceAusrichtung(this.ausrichtung)],
      color: FARBEN[coerceFarbe(this.farbe)],
    }

    return html`<div
      class="text"
      style=${styleMap(stil)}
      data-ff-editable
      data-ff-spot="text"
      ?data-ff-bound=${this.textField !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'text')}
    >${this.text}</div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    connectText(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    disconnectText(this)
  }
}

Grundbaustein.defineAndRegister(TextBlock)
