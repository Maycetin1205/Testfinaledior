// Baustein Karte: ein Kaertchen mit Titel, Text, Datum, Zeit und Chip.
import { html, nothing, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import { bindbar, type BindungsProp, type Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import {
  farbweltEigenschaft,
  farbweltStil,
  farbweltWert,
  type FarbweltWert,
} from '../faehigkeiten/farbwelt'
import { kartenStil } from './kartenStil'

type TextStelle = 'titel' | 'titel2' | 'zeit' | 'datum' | 'unterzeile' | 'text'

export class Karte extends Grundbaustein {
  static readonly typ = 'karte'
  static readonly tag = 'ff-karte'
  static readonly anzeigeName = 'Karte'
  static readonly kategorie: Kategorie = 'anzeige'

  // Die eine Karte einer Tafel ist deren Vorlage; jede Laufzeitkarte ist ihre
  // Kopie. Darum steht sie nicht in der Palette und nur unter einer Tafel.
  static readonly erlaubteEltern = ['kanban']
  static readonly inPalette = false

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false

  static readonly vorgaben = {
    chipFarbwelt: 'info',
    titel: '',
    titel2: '',
    zeit: '',
    datum: '',
    unterzeile: '',
    text: '',
    chip: '',

    titelField: '',
    titel2Field: '',
    zeitField: '',
    datumField: '',
    unterzeileField: '',
    textField: '',
    chipField: '',
  }

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    bindbar<typeof Karte.vorgaben>([
      { prop: 'zeit', name: 'Zeit' },
      { prop: 'datum', name: 'Datum' },
      { prop: 'titel', name: 'Titel' },
      { prop: 'titel2', name: 'Titel 2' },
      { prop: 'unterzeile', name: 'Unterzeile' },
      { prop: 'text', name: 'Textzeile' },
      { prop: 'chip', name: 'Chip' },
    ]),
  ]

  static override readonly eigenschaften: Eigenschaft[] = [
    farbweltEigenschaft(
      'chipFarbwelt',
      'Bedeutung des Chips auf der Karte — bestimmt die Chip-Farbe.',
    ),
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, farbweltStil, kartenStil]

  @property() chipFarbwelt: FarbweltWert = 'info'
  @property() titel = ''
  @property() titel2 = ''
  @property() zeit = ''
  @property() datum = ''
  @property() unterzeile = ''
  @property() text = ''
  @property() chip = ''
  @property() titelField = ''
  @property() titel2Field = ''
  @property() zeitField = ''
  @property() datumField = ''
  @property() unterzeileField = ''
  @property() textField = ''
  @property() chipField = ''

  private stelle(prop: TextStelle | 'chip', klasse: string): TemplateResult {
    return html`<span
      class=${klasse}
      data-ff-editable
      data-ff-spot=${prop}
      ?data-ff-bound=${this[`${prop}Field` satisfies BindungsProp<TextStelle | 'chip'>] !== ''}
      @dblclick=${(e: MouseEvent) => this.inlineEdit(e, prop)}
    >${this[prop]}</span>`
  }

  override render(): TemplateResult {
    const welt = farbweltWert(this.chipFarbwelt)

    // Im Editor steht jede Stelle da, auch die leere: sonst waere sie nicht
    // anzuklicken. Der Strich dafuer steht im Stil, kein erfundener Wert.
    const imEditor = this.imEditor
    const zeigt = (wert: string): boolean => imEditor || wert.trim() !== ''

    const fuss = zeigt(this.titel2) || zeigt(this.datum) || zeigt(this.zeit) || zeigt(this.chip)
    return html`<div class="karte">
      ${zeigt(this.titel) ? this.stelle('titel', 'name') : nothing}
      ${zeigt(this.unterzeile) ? this.stelle('unterzeile', 'zusatz') : nothing}
      ${zeigt(this.text) ? this.stelle('text', 'grund') : nothing}
      ${fuss
        ? html`<div class="fuss">
            ${zeigt(this.titel2) ? this.stelle('titel2', 'fussl') : nothing}
            ${zeigt(this.datum) ? this.stelle('datum', 'datum') : nothing}
            ${zeigt(this.zeit) ? this.stelle('zeit', 'zeit') : nothing}
            ${zeigt(this.chip) ? this.stelle('chip', `chip v-${welt}`) : nothing}
          </div>`
        : nothing}
    </div>`
  }
}

Grundbaustein.defineAndRegister(Karte)
