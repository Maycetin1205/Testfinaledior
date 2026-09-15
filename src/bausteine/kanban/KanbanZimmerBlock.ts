// Baustein Kanban-Zimmer: eine benannte Flaeche innerhalb einer Spalte.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { leerStil, leerZustand } from '../shared/leerZustand'
import { ZIEL_KLASSE, zielStil } from './zielStil'
import { kartenAbstandStil } from './kartenAbstand'

export const ZIMMER_LEER_TEXT = 'frei · hierher ziehen'

export const ZIMMER_INHALT_EVENT = 'ff-zimmer-inhalt'

export class KanbanZimmerBlock extends Grundbaustein {
  static readonly typ = 'kanban-zimmer'
  static readonly tag = 'ff-kanban-zimmer'
  static readonly anzeigeName = 'Kanban-Zimmer'
  static readonly kategorie: Kategorie = 'anzeige'
  static readonly nimmtKinder = false
  static readonly inPalette = false
  static readonly behaelterRahmen = false

  static readonly erlaubteEltern = ['kanban-spalte']

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false
  static readonly vorgaben = {
    heading: 'Neues Zimmer',
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

  static override styles = [
    Grundbaustein.styles,
    leerStil,
    kartenAbstandStil,
    zielStil,
    css`
      :host { display: block; }

      .kopf {
        padding: 2px 2px 0;
        font-family: var(--se-font);
        font-size: var(--se-fs-sm);
        font-weight: 700;
        line-height: 1.3;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--se-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .body {
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }

      .zimmer {
        border-radius: var(--se-r-md);
      }
    `,
  ]

  @property() heading = 'Neues Zimmer'
  @property() wert = ''

  @property({ attribute: false }) leerHinweis = ''

  private onSlotChange(): void {
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
        @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
      >${this.heading}</div>
      <div class="body">
        <slot @slotchange=${this.onSlotChange}></slot>
        ${leerZustand(this.leerHinweis)}
      </div>
    </div>`
  }
}

Grundbaustein.defineAndRegister(KanbanZimmerBlock)
