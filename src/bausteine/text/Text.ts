// Baustein Text: eine Zeile Text, frei getippt oder an ein Feld gebunden.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { bindbar, bindungsAttr, type Faehigkeit } from '../../kern/maske/faehigkeiten'
import { FARBWELTEN, farbweltOptionen } from '../../kern/maske/farbwelten'
import { leseGebundeneStelle } from '../faehigkeiten/gebundeneStelle'
import { macheDatenAnschluss, quelleIdVon } from '../faehigkeiten/quelle'
import { textStil } from './textStil'

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

const TEXT_BINDUNG = bindungsAttr('text')

// „ueberschrift" und „klein" standen in Masken, bevor die Groesse eine Zahl
// war; ohne sie saessen sie stillschweigend auf dem Standardwert.
function groesseVon(v: unknown): number {
  if (v === 'ueberschrift') return 15
  if (v === 'klein') return 12
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
  if (!Number.isFinite(n)) return GROESSE_STANDARD
  return Math.min(GROESSE_MAX, Math.max(GROESSE_MIN, n))
}

function gewichtVon(v: unknown): Gewicht {
  return typeof v === 'string' && v in GEWICHTE ? (v as Gewicht) : 'normal'
}

function ausrichtungVon(v: unknown): Ausrichtung {
  return typeof v === 'string' && v in AUSRICHTUNGEN ? (v as Ausrichtung) : 'links'
}

function farbeVon(v: unknown): string {
  return typeof v === 'string' && v in FARBEN ? v : FARBE_STANDARD
}

export class Text extends Grundbaustein {
  static readonly typ = 'text'
  static readonly tag = 'ff-text'
  static readonly anzeigeName = 'Text'
  static readonly kategorie: Kategorie = 'anzeige'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'auswahlFolgen' },
    bindbar<typeof Text.vorgaben>([{ prop: 'text', name: 'Text' }]),
  ]

  static readonly vorgaben = {
    groesse: GROESSE_STANDARD,
    gewicht: 'normal',
    ausrichtung: 'links',
    farbe: FARBE_STANDARD,
    text: 'Text',
    quelle: '',
    textField: '',
  }

  static readonly raster = { startBreite: 12, startHoehe: 2, minBreite: 2, minHoehe: 1 }

  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'groesse',
      name: 'Größe',
      beschreibung: 'Schriftgröße in Pixeln.',
      art: 'number',
      einheit: 'px',
      min: GROESSE_MIN,
      max: GROESSE_MAX,
      zeile: 'Text-Stil',
    },
    {
      schluessel: 'gewicht',
      name: 'Gewicht',
      beschreibung: 'Strichstärke der Schrift.',
      art: 'segment',
      optionen: [
        { wert: 'duenn', name: 'Dünn' },
        { wert: 'normal', name: 'Normal' },
        { wert: 'fett', name: 'Fett' },
      ],
      zeile: 'Text-Stil',
    },
    {
      schluessel: 'ausrichtung',
      name: 'Ausrichtung',
      beschreibung: 'Wo der Text in seiner Breite sitzt.',
      art: 'segment',
      optionen: [
        { wert: 'links', name: 'Links' },
        { wert: 'mitte', name: 'Mitte' },
        { wert: 'rechts', name: 'Rechts' },
      ],
      zeile: 'Text-Stil',
    },
    {
      schluessel: 'farbe',
      name: 'Farbe',
      beschreibung: 'Textfarbe aus den Farben der Maske.',
      art: 'select',
      optionen: [
        ...NEUTRALE_FARBEN.map((f) => ({ wert: f.wert, name: f.name, farbe: `var(${f.token})` })),
        ...farbweltOptionen(),
      ],
    },
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, textStil]

  @property({ type: Number }) groesse: number = GROESSE_STANDARD

  @property() gewicht = 'normal'

  @property() ausrichtung = 'links'

  @property() farbe = FARBE_STANDARD

  @property() text = 'Text'

  @property() quelle = ''

  @property() textField = ''

  override render(): TemplateResult {
    const stil = {
      fontSize: `${groesseVon(this.groesse)}px`,
      fontWeight: GEWICHTE[gewichtVon(this.gewicht)],
      textAlign: AUSRICHTUNGEN[ausrichtungVon(this.ausrichtung)],
      color: FARBEN[farbeVon(this.farbe)],
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
    anschluss.connect(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    anschluss.disconnect(this)
  }
}

// Der Text am Datenstrom: die gebundene Stelle einsetzen. Ein gebundener Text
// zeigt bis zur ersten Lieferung nichts, sonst stuende dort der getippte Text
// als scheinbarer Wert.
const anschluss = macheDatenAnschluss<Text>({
  hydriere: (el) => {
    const stelle = leseGebundeneStelle(el, TEXT_BINDUNG)
    if (stelle.art === 'ungebunden') return
    el.text = stelle.art === 'wert' ? stelle.wert : ''
  },
  verdrahte: (el) => {
    if (quelleIdVon(el) !== '' && el.getAttribute(TEXT_BINDUNG)) el.text = ''
  },
})

Grundbaustein.defineAndRegister(Text)
