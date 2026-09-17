// Baustein Kanban: die Tafel, die ihre Spalten und deren Karten traegt.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { KindVorgabe } from '../../kern/maske/bausteinArt'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { Richtung, FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { LEER_TEXT_STANDARD, leerTextEigenschaft } from '../faehigkeiten/leerZustand'
import { tagFeldEigenschaft } from '../faehigkeiten/quelle'
import {
  KARTE_TYP,
  tafelAbmelden,
  tafelAnmelden,
  VERSCHIEBEN_EVENT,
  type TafelZiel,
} from '../faehigkeiten/kartenTafel'
import { KanbanSpalte } from './KanbanSpalte'
import { kanbanStil } from './kanbanStil'

export class Kanban extends Grundbaustein {
  static readonly typ = 'kanban'
  static readonly tag = 'ff-kanban'
  static readonly anzeigeName = 'Kanban'
  static readonly kategorie: Kategorie = 'anzeige'

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'satzwahl' },
    {
      art: 'ereignisse',
      liste: [
        { schluessel: 'onCardClick', name: 'Karte angeklickt' },
        { schluessel: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ]

  static readonly nimmtKinder = true
  static readonly erlaubteKinder = [KARTE_TYP, KanbanSpalte.typ]
  static readonly kinderRichtung: Richtung = 'row'

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false
  static readonly hoeheAenderbar = true
  static readonly kindKnopf = { name: 'Spalte', kindTyp: KanbanSpalte.typ }

  // Die eine Karte der Tafel ist ihre Vorlage. Sie haengt an der Tafel, nicht
  // an einer Spalte: eine geloeschte Spalte nimmt sie sonst mit. Gestapelt
  // liegen die Kopien aber in einer Spalte, und danach misst sie sich.
  static readonly musterKind = { typ: KARTE_TYP, name: 'Kartenmuster', richtung: 'column' as const }

  static readonly vorgaben = {
    quelle: '',
    spaltenFeld: '',
    tagFeld: '',
    leerText: LEER_TEXT_STANDARD,
  }

  static readonly raster = { startBreite: 48, startHoehe: 20, minBreite: 12, minHoehe: 8 }

  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'spaltenFeld',
      name: 'Einsortieren nach',
      beschreibung: 'Feld, das die Spalte bestimmt. Leer: alle in die Auffang-Spalte.',
      art: 'field',
    },
    tagFeldEigenschaft(),
    leerTextEigenschaft(),
  ]

  static readonly kinderVorgabe: KindVorgabe[] = [
    { typ: KARTE_TYP },
    { typ: KanbanSpalte.typ, werte: { titel: 'Offen', farbwelt: 'warning' } },
    { typ: KanbanSpalte.typ, werte: { titel: 'In Arbeit', farbwelt: 'info' } },
    { typ: KanbanSpalte.typ, werte: { titel: 'Fertig', farbwelt: 'success' } },
  ]

  static override styles: CSSResultGroup = [Grundbaustein.styles, kanbanStil]

  @property({ attribute: false }) meldung = ''
  @property({ attribute: false }) beschaeftigt = false
  @property({ attribute: false }) auswahlTitel = ''
  @property({ attribute: false }) aktuellesZiel = ''
  @property({ attribute: false }) ziele: TafelZiel[] = []

  // Ein Zeiger taugt nicht auf jedem Geraet: dieselbe Verschiebung geht auch
  // ueber die Wahl eines Ziels. Ohne gewaehlte Karte steht die Zeile nicht da.
  private zielGewaehlt(ereignis: Event): void {
    const feld = ereignis.currentTarget as HTMLSelectElement
    const ziel = feld.value
    feld.value = this.aktuellesZiel
    this.dispatchEvent(new CustomEvent(VERSCHIEBEN_EVENT, { detail: ziel }))
  }

  override render(): TemplateResult {
    return html`
      <p class="meldung" role="status" aria-live="polite">${this.meldung}</p>
      ${this.auswahlTitel ? html`<label class="bedienung">
        <span>${this.auswahlTitel} verschieben nach</span>
        <select aria-label="Ziel für die gewählte Karte" .value=${this.aktuellesZiel}
          ?disabled=${this.beschaeftigt}
          @change=${this.zielGewaehlt}>
          ${this.ziele.map((ziel) => html`<option value=${ziel.id} ?selected=${ziel.id === this.aktuellesZiel}>${ziel.name}</option>`)}
        </select>
      </label>` : ''}
      <div class="tafel"><slot></slot></div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    tafelAnmelden(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    tafelAbmelden(this)
  }
}

Grundbaustein.defineAndRegister(Kanban)
