// Baustein Trenner: eine Linie, die die Flaeche teilt, waagerecht oder senkrecht.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { trennerStil } from './trennerStil'

const RICHTUNG_STANDARD = 'waagerecht'

const STAERKE_MIN = 1
const STAERKE_MAX = 8
const STAERKE_STANDARD = 1

// Gespeichert wird das deutsche Wort, border-style bekommt daneben seines: die
// Linie heisst wie ihre Nachbarn Richtung, Staerke und Farbe.
const STRICHE: Record<string, string> = {
  durchgezogen: 'solid',
  gestrichelt: 'dashed',
  gepunktet: 'dotted',
}
const STRICH_STANDARD = 'durchgezogen'
const CSS_STRICHE = new Set(Object.values(STRICHE))

const FARBEN: Record<string, string> = {
  linie: '--se-line',
  dezent: '--se-line-soft',
  dunkel: '--se-muted',
  akzent: '--se-accent',
}
const FARBE_STANDARD = 'linie'

// Eine vor der Umbenennung exportierte Maske traegt noch das CSS-Wort; ohne
// diese Zeile faellt sie stumm auf die durchgezogene Linie zurueck.
function strichVon(wert: unknown): string {
  const wort = typeof wert === 'string' ? wert : ''
  if (wort in STRICHE) return STRICHE[wort]
  return CSS_STRICHE.has(wort) ? wort : STRICHE[STRICH_STANDARD]
}

function staerkeVon(wert: unknown): number {
  const zahl = typeof wert === 'number' ? wert : Number.parseFloat(String(wert ?? ''))
  if (!Number.isFinite(zahl)) return STAERKE_STANDARD
  return Math.min(STAERKE_MAX, Math.max(STAERKE_MIN, zahl))
}

function farbeVon(wert: unknown): string {
  const wort = typeof wert === 'string' ? wert : ''
  return `var(${FARBEN[wort] ?? FARBEN[FARBE_STANDARD]})`
}

export class Trenner extends Grundbaustein {
  static readonly typ = 'trenner'
  static readonly tag = 'ff-trenner'
  static readonly anzeigeName = 'Trennlinie'
  static readonly kategorie: Kategorie = 'layout'

  // Keine. Die Linie liest keine Quelle, fuehrt keine Liste, nimmt keine
  // Eingabe und hat kein Ereignis: sie teilt die Flaeche und sonst nichts.
  static readonly faehigkeiten: readonly Faehigkeit[] = []

  static readonly vorgaben = {
    richtung: RICHTUNG_STANDARD,
    stil: STRICH_STANDARD,
    staerke: STAERKE_STANDARD,
    farbe: FARBE_STANDARD,
  }

  static readonly breiteAenderbar = true
  static readonly hoeheAenderbar = true

  static readonly raster = { startBreite: 48, startHoehe: 1, minBreite: 1, minHoehe: 1 }

  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'richtung',
      name: 'Richtung',
      beschreibung: 'Die Linie waagerecht oder senkrecht ausrichten.',
      art: 'segment',
      optionen: [
        { wert: 'waagerecht', name: 'Waagerecht' },
        { wert: 'senkrecht', name: 'Senkrecht' },
      ],
    },
    {
      schluessel: 'stil',
      name: 'Linienstil',
      beschreibung: 'Durchgezogen, gestrichelt oder gepunktet.',
      art: 'select',
      optionen: [
        { wert: 'durchgezogen', name: 'Durchgezogen' },
        { wert: 'gestrichelt', name: 'Gestrichelt' },
        { wert: 'gepunktet', name: 'Gepunktet' },
      ],
    },
    {
      schluessel: 'staerke',
      name: 'Stärke',
      beschreibung: 'Dicke der Linie in Pixeln.',
      art: 'number',
      einheit: 'px',
      min: STAERKE_MIN,
      max: STAERKE_MAX,
    },
    {
      schluessel: 'farbe',
      name: 'Farbe',
      beschreibung: 'Farbe aus dem Design der Maske.',
      art: 'select',
      optionen: [
        { wert: 'linie', name: 'Standard' },
        { wert: 'dezent', name: 'Dezent' },
        { wert: 'dunkel', name: 'Dunkel' },
        { wert: 'akzent', name: 'Akzent' },
      ],
    },
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, trennerStil]

  @property() richtung = RICHTUNG_STANDARD

  @property() stil = STRICH_STANDARD

  @property({ type: Number }) staerke: number = STAERKE_STANDARD

  @property() farbe = FARBE_STANDARD

  override render(): TemplateResult {
    const senkrecht = this.richtung === 'senkrecht'
    return html`<div
      class="flaeche ${senkrecht ? 'senkrecht' : ''}"
      role="separator"
      aria-orientation=${senkrecht ? 'vertical' : 'horizontal'}
      style=${styleMap({
        '--strich-breite': `${staerkeVon(this.staerke)}px`,
        '--strich-stil': strichVon(this.stil),
        '--strich-farbe': farbeVon(this.farbe),
      })}
    ><div class="linie"></div></div>`
  }
}

Grundbaustein.defineAndRegister(Trenner)
