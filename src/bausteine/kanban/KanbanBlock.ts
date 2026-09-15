// Baustein Kanban: die Tafel, die ihre Spalten und deren Karten traegt.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { KindVorgabe } from '../../kern/maske/bausteinArt'
import type { Faehigkeit } from '../../kern/maske/faehigkeiten'
import type { Richtung, FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { CardBlock } from '../card/CardBlock'
import { LEER_TEXT_STANDARD, leerTextProperty } from '../shared/leerZustand'
import { KanbanMusterBlock } from './KanbanMusterBlock'
import { KanbanSpalteBlock } from './KanbanSpalteBlock'
import { connectBoard, disconnectBoard, type KanbanZiel } from './seRuntime'

const SPALTE = KanbanSpalteBlock.typ

export class KanbanBlock extends Grundbaustein {
  static readonly typ = 'kanban'
  static readonly tag = 'ff-kanban'
  static readonly anzeigeName = 'Kanban'
  static readonly kategorie: Kategorie = 'anzeige'
  static readonly nimmtKinder = true
  static readonly erlaubteKinder = [KanbanMusterBlock.typ, SPALTE]
  static readonly kinderRichtung: Richtung = 'row'

  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false
  static readonly behaelterRahmen = false
  static readonly kindKnopf = { label: 'Spalte', childType: SPALTE }

  static readonly musterKind = { type: CardBlock.typ, label: 'Muster' }

  static readonly hoeheAenderbar = true

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

  static readonly vorgaben = {
    width: 'fill', height: 'fill' as const,
    source: '', statusField: '', tagField: '',
    leerText: LEER_TEXT_STANDARD,
  }

  static readonly raster = { startBreite: 48, startHoehe: 20, minBreite: 12, minHoehe: 8 }
  static override readonly eigenschaften: Eigenschaft[] = [
    {
      schluessel: 'statusField',
      name: 'Einsortieren nach',
      beschreibung: 'Feld, das die Spalte bestimmt. Leer: alle in die Auffang-Spalte.',      art: 'field',
    },
    {
      schluessel: 'tagField',
      name: 'Tag filtern nach',
      beschreibung: 'Datumsfeld. Gesetzt: nur Einträge des gewählten Tages.',
      art: 'field',
    },

    leerTextProperty(),
  ]

  static readonly kinderVorgabe: KindVorgabe[] = [
    { typ: KanbanMusterBlock.typ, kinder: [{ typ: CardBlock.typ }] },
    {
      typ: SPALTE,
      werte: { heading: 'Offen', variant: 'warning' },
    },
    { typ: SPALTE, werte: { heading: 'In Arbeit', variant: 'info' } },
    { typ: SPALTE, werte: { heading: 'Fertig', variant: 'success' } },
  ]

  static override styles = [
    Grundbaustein.styles,
    css`

      :host { min-width: 0; height: 100%; display: flex; flex-direction: column; }
      .muster { flex: none; margin-bottom: 12px; padding: 8px; border: 1px dashed var(--se-muted); border-radius: var(--se-r-md); }
      .status:empty { display: none; }
      .status { flex: none; margin: 0 0 8px; font-size: var(--se-fs-sm); color: var(--se-muted); }
      .bedienung { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
      select { font: inherit; max-width: 100%; padding: 6px; border: 1px solid var(--se-muted); border-radius: var(--se-r-md); color: var(--se-ink); background: var(--se-panel); }
      .board {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: var(--se-gap-lg);
        flex: 1;
        min-height: 0;
        overflow-x: auto;
        box-sizing: border-box;
      }
      .board slot { display: contents; }
    `,
  ]

  @property({ attribute: false }) statusText = ''
  @property({ attribute: false }) beschaeftigt = false
  @property({ attribute: false }) auswahlTitel = ''
  @property({ attribute: false }) aktuellesZiel = ''
  @property({ attribute: false }) ziele: KanbanZiel[] = []

  override render(): TemplateResult {
    return html`
      ${this.imEditor ? html`<div class="muster"><slot name="muster"></slot></div>` : html`
        <p class="status" role="status" aria-live="polite">${this.statusText}</p>
        ${this.auswahlTitel ? html`<label class="bedienung">
          <span>${this.auswahlTitel} verschieben nach</span>
          <select aria-label="Ziel für die gewählte Karte" .value=${this.aktuellesZiel}
            ?disabled=${this.beschaeftigt}
            @change=${(event: Event) => {
              const feld = event.currentTarget as HTMLSelectElement
              const ziel = feld.value
              feld.value = this.aktuellesZiel
              this.dispatchEvent(new CustomEvent('ff-kanban-verschieben', { detail: ziel }))
            }}>
            ${this.ziele.map((ziel) => html`<option value=${ziel.id} ?selected=${ziel.id === this.aktuellesZiel}>${ziel.name}</option>`)}
          </select>
        </label>` : ''}
      `}
      <div class="board"><slot></slot></div>`
  }

  override connectedCallback(): void {
    super.connectedCallback()
    connectBoard(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    disconnectBoard(this)
  }
}

Grundbaustein.defineAndRegister(KanbanBlock)
