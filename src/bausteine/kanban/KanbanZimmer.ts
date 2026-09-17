// Baustein Unterteilung: eine benannte Flaeche innerhalb einer Spalte.
import { html, type CSSResultGroup, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import { leerStil, leerZustand } from '../faehigkeiten/leerZustand'
import {
  tafelFlaechenStil,
  ZIEL_KLASSE,
  ZIMMER_INHALT_EVENT,
  ZIMMER_TAG,
  ZIMMER_TITEL_STANDARD,
} from '../faehigkeiten/kartenTafel'
import { kanbanZimmerStil } from './kanbanZimmerStil'

export class KanbanZimmer extends Grundbaustein {
  // Woertlich, nicht aus der Faehigkeit: tools/laufzeitBauen.mjs findet einen
  // Baustein nur an einem geschriebenen Typ.
  static readonly typ = 'kanban-zimmer'
  static readonly tag = ZIMMER_TAG
  static readonly anzeigeName = 'Unterteilung'
  static readonly kategorie: Kategorie = 'anzeige'

  // Keine. Die Unterteilung liest keine Quelle und fuehrt keine Liste; sie ist
  // eine Ablage, die die Faehigkeit Kartentafel fuellt.
  static readonly faehigkeiten: readonly Faehigkeit[] = []

  // Nimmt Kinder, damit die Vorlage der Tafel im Editor hier liegen kann, wo
  // zur Laufzeit die Karten liegen. Einziehen laesst sich nichts: die Karte
  // erlaubt als Eltern nur die Tafel.
  static readonly nimmtKinder = true
  static readonly erlaubteKinder: readonly string[] = []
  static readonly inPalette = false
  static readonly behaelterRahmen = false

  static readonly erlaubteEltern = ['kanban-spalte']

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false

  static readonly vorgaben = {
    titel: ZIMMER_TITEL_STANDARD,
    wert: '',
  }

  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'wert',
      bearbeitung: 'inspector',
      name: 'Wert im ERP',
      beschreibung: 'Steht im Feld der Unterteilung, wenn eine Karte hier liegt. Leer: der Titel.',
      art: 'text',
    },
  ]

  static override styles: CSSResultGroup = [
    Grundbaustein.styles,
    leerStil,
    tafelFlaechenStil,
    kanbanZimmerStil,
  ]

  @property() titel = ZIMMER_TITEL_STANDARD
  @property() wert = ''

  @property({ attribute: false }) leerHinweis = ''

  private inhaltGewechselt(): void {
    this.dispatchEvent(new CustomEvent(ZIMMER_INHALT_EVENT, {
      bubbles: true,
      composed: true,
    }))
  }

  override render(): TemplateResult {
    return html`<div class="zimmer ${ZIEL_KLASSE}">
      <div
        class="kopf"
        data-ff-editable
        @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'titel')}
      >${this.titel}</div>
      <div class="rumpf">
        <slot @slotchange=${this.inhaltGewechselt}></slot>
        ${leerZustand(this.leerHinweis)}
      </div>
    </div>`
  }
}

Grundbaustein.defineAndRegister(KanbanZimmer)
