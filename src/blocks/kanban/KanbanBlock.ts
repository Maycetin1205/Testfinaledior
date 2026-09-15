// Baustein Kanban: die Tafel, die ihre Spalten und deren Karten traegt.
import { css, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { BasicBlock } from '../base/BasicBlock'
import type { BlockCategory } from '../../core/blocks/BlockComponent'
import type { DefaultChildSpec } from '../../core/blocks/BlockDefinition'
import type { Faehigkeit } from '../../core/blocks/faehigkeiten'
import type { FlowDirection, FlowWidth } from '../../core/blocks/flowLayout'
import type { PropertyDescription } from '../../core/blocks/PropertyDescription'
import { CardBlock } from '../card/CardBlock'
import { LEER_TEXT_STANDARD, leerTextProperty } from '../shared/leerZustand'
import { KanbanMusterBlock } from './KanbanMusterBlock'
import { KanbanSpalteBlock } from './KanbanSpalteBlock'
import { connectBoard, disconnectBoard, type KanbanZiel } from './seRuntime'

const SPALTE = KanbanSpalteBlock.blockType

export class KanbanBlock extends BasicBlock {
  static readonly blockType = 'kanban'
  static readonly tagName = 'ff-kanban'
  static readonly displayName = 'Kanban'
  static readonly category: BlockCategory = 'anzeige'
  static readonly acceptsChildren = true
  static readonly allowedChildTypes = [KanbanMusterBlock.blockType, SPALTE]
  static readonly childDirection: FlowDirection = 'row'

  static readonly lockedWidth: FlowWidth = 'fill'
  static readonly resizableWidth = false
  static readonly containerHint = false
  static readonly addChildButton = { label: 'Spalte', childType: SPALTE }

  static readonly templateChild = { type: CardBlock.blockType, label: 'Muster' }

  static readonly resizableHeight = true

  static readonly faehigkeiten: readonly Faehigkeit[] = [
    { art: 'quelle' },
    { art: 'satzwahl' },
    {
      art: 'ereignisse',
      liste: [
        { key: 'onCardClick', name: 'Karte angeklickt' },
        { key: 'onCardDrop', name: 'Karte verschoben' },
      ],
    },
  ]

  static readonly defaultProps = {
    width: 'fill', height: 'fill' as const,
    source: '', statusField: '', tagField: '',
    leerText: LEER_TEXT_STANDARD,
  }

  static readonly raster = { startW: 48, startH: 20, minW: 12, minH: 8 }
  static override readonly customProperties: PropertyDescription[] = [
    {
      attributeName: 'statusField',
      name: 'Einsortieren nach',
      description: 'Feld, das die Spalte bestimmt. Leer: alle in die Auffang-Spalte.',      kind: 'field',
    },
    {
      attributeName: 'tagField',
      name: 'Tag filtern nach',
      description: 'Datumsfeld. Gesetzt: nur Einträge des gewählten Tages.',
      kind: 'field',
    },

    leerTextProperty(),
  ]

  static readonly defaultChildren: DefaultChildSpec[] = [
    { type: KanbanMusterBlock.blockType, children: [{ type: CardBlock.blockType }] },
    {
      type: SPALTE,
      props: { heading: 'Offen', variant: 'warning' },
    },
    { type: SPALTE, props: { heading: 'In Arbeit', variant: 'info' } },
    { type: SPALTE, props: { heading: 'Fertig', variant: 'success' } },
  ]

  static override styles = [
    BasicBlock.styles,
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

BasicBlock.defineAndRegister(KanbanBlock)
