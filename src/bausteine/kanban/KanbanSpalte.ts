// Baustein Kanban-Spalte: eine Bahn der Tafel, Ziel eines gezogenen Kaertchens.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Richtung, FlussBreite } from '../../kern/maske/fluss'
import { jaNeinEigenschaft, type Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { farbweltEigenschaft, farbweltStil, farbweltWert, type FarbweltWert } from '../faehigkeiten/farbwelt'
import { leerStil, leerZustand } from '../faehigkeiten/leerZustand'
import {
  KARTE_TAG,
  SPALTE_TAG,
  SPALTE_TITEL_STANDARD,
  tafelFlaechenStil,
  ZIEL_KLASSE,
  ZIMMER_INHALT_EVENT,
} from '../faehigkeiten/kartenTafel'
import { KanbanZimmer } from './KanbanZimmer'
import { kanbanSpalteStil } from './kanbanSpalteStil'

export class KanbanSpalte extends Grundbaustein {
  // Woertlich, nicht aus der Faehigkeit: tools/laufzeitBauen.mjs findet einen
  // Baustein nur an einem geschriebenen Typ.
  static readonly typ = 'kanban-spalte'
  static readonly tag = SPALTE_TAG
  static readonly anzeigeName = 'Kanban-Spalte'
  static readonly kategorie: Kategorie = 'anzeige'

  // Keine. Die Spalte liest keine Quelle; sie ist eine Bahn, die die Faehigkeit
  // Kartentafel fuellt.
  static readonly faehigkeiten: readonly Faehigkeit[] = []

  static readonly nimmtKinder = true
  static readonly erlaubteKinder = [KanbanZimmer.typ]

  static readonly kindKnopf = {
    name: 'Unterteilung',
    kindTyp: KanbanZimmer.typ,
    // „+ Unterteilung" heisst „+ Mitarbeiter", sobald ein Feld gewaehlt ist:
    // der Bauer soll lesen, wonach er hier unterteilt.
    nameAusFeld: 'unterteilungsFeld',
  }

  static readonly kinderRichtung: Richtung = 'column'
  static readonly inPalette = false
  static readonly behaelterRahmen = false

  static readonly erlaubteEltern = ['kanban']
  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false

  static readonly vorgaben = {
    farbwelt: 'info',
    titel: SPALTE_TITEL_STANDARD,
    wert: '',
    auffang: 'nein',
    unterteilungsFeld: '',
  }

  static override readonly eigenschaften: Eigenschaft[] = [
    farbweltEigenschaft(
      'farbwelt',
      'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Rahmen).',
    ),
    jaNeinEigenschaft(
      'auffang',
      'Auffangspalte',
      'Einträge ohne passenden Wert landen hier.',
      { brauchtQuelle: true, einzigUnterGeschwistern: true },
    ),

    {
      schluessel: 'wert',
      bearbeitung: 'inspector',
      name: 'Wert im ERP',
      beschreibung: 'Steht im Statusfeld, wenn eine Karte hier liegt. Leer: der Titel.',
      art: 'text',
    },

    {
      schluessel: 'unterteilungsFeld',
      name: 'Unterteilen nach',
      beschreibung: 'Wähle das Datenfeld, nach dem die Spalte unterteilt wird, z. B. Mitarbeiter oder Raum. Die Unterteilungen heißen danach wie dieses Feld. Trage an jeder den passenden ERP-Wert ein; unbekannte Werte landen in der ersten.',
      art: 'field',
    },
  ]

  static override styles: CSSResultGroup = [
    Grundbaustein.styles,
    leerStil,
    tafelFlaechenStil,
    farbweltStil,
    kanbanSpalteStil,
  ]

  @property() farbwelt: FarbweltWert = 'info'
  @property() titel = SPALTE_TITEL_STANDARD
  @property() wert = ''

  @property({ attribute: false }) leerHinweis = ''

  @state() private _anzahl = 0

  constructor() {
    super()

    this.addEventListener(ZIMMER_INHALT_EVENT, () => this.zaehle())
  }

  // Gezaehlt werden die Karten aus Daten. Die Vorlage, die der Editor hier
  // hinstellt, traegt data-ff-editor und ist kein Datensatz.
  private zaehle(): void {
    this._anzahl = Array.from(this.querySelectorAll(KARTE_TAG))
      .filter((el) => !el.hasAttribute('data-ff-editor'))
      .length
  }

  override render(): TemplateResult {
    return html`<div class="spalte ${ZIEL_KLASSE} v-${farbweltWert(this.farbwelt)}">
      <div class="kopf">
        <span class="punkt"></span>
        <span
          class="titel"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'titel')}
        >${this.titel}</span>
        <span class="anzahl">${this._anzahl}</span>
      </div>
      <div class="rumpf">
        <slot @slotchange=${this.zaehle}></slot>
        ${leerZustand(this.leerHinweis)}
      </div>
    </div>`
  }
}

Grundbaustein.defineAndRegister(KanbanSpalte)
