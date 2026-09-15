// Baustein Kanban-Spalte: eine Bahn der Tafel, Ziel eines gezogenen Kaertchens.
import { css, html, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { BasicBlock } from '../base/BasicBlock'
import type { Kategorie } from '../../core/blocks/BlockComponent'
import type { Richtung, FlussBreite } from '../../core/blocks/flowLayout'
import type { Eigenschaft } from '../../core/blocks/PropertyDescription'
import { CardBlock } from '../card/CardBlock'
import { jaNeinProperty } from '../shared/jaNeinProperty'
import { leerStil, leerZustand } from '../shared/leerZustand'
import {
  coerceStatusVariant,
  farbweltStil,
  statusVariantProperty,
  type StatusVariant,
} from '../shared/statusVariant'
import { ZIEL_KLASSE, zielStil } from './zielStil'
import { kartenAbstandStil } from './kartenAbstand'
import { KanbanZimmerBlock, ZIMMER_INHALT_EVENT } from './KanbanZimmerBlock'

export class KanbanSpalteBlock extends BasicBlock {
  static readonly blockType = 'kanban-spalte'
  static readonly tagName = 'ff-kanban-spalte'
  static readonly displayName = 'Kanban-Spalte'
  static readonly category: Kategorie = 'anzeige'
  static readonly acceptsChildren = true

  static readonly allowedChildTypes: string[] = [
    KanbanZimmerBlock.blockType,
  ]

  static readonly addChildButton = { label: 'Zimmer', childType: KanbanZimmerBlock.blockType }
  static readonly childDirection: Richtung = 'column'
  static readonly showInPalette = false
  static readonly containerHint = false

  static readonly allowedParentTypes = ['kanban']
  static readonly lockedWidth: FlussBreite = 'fill'
  static readonly resizableWidth = false

  static readonly defaultProps = {
    variant: 'info',
    heading: 'Neue Spalte',
    wert: '',
    auffang: 'nein',
    zimmerField: '',
  }

  static override readonly customProperties: Eigenschaft[] = [
    statusVariantProperty(
      'variant',
      'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Rahmen).',
    ),
    jaNeinProperty(
      'auffang',
      'Auffangspalte',
      'Eintr\u00E4ge ohne passenden Wert landen hier.',
      { requiresDataSource: true, exclusiveAmongSiblings: true },
    ),

    {
      attributeName: 'wert',
      bearbeitung: 'inspector',
      name: 'Wert im ERP',
      description: 'Steht im Statusfeld, wenn eine Karte hier liegt. Leer: der Titel.',
      kind: 'text',
    },

    {
      attributeName: 'zimmerField',
      name: 'Unterteilen nach',
      description: 'Wähle das Datenfeld für die Zimmer, z. B. Mitarbeiter oder Raum. Trage an jedem Zimmer den passenden ERP-Wert ein. Unbekannte Werte landen im ersten Zimmer.',
      kind: 'field',
    },
  ]

  static override styles = [
    BasicBlock.styles,
    leerStil,
    kartenAbstandStil,
    zielStil,
    farbweltStil,
    css`

      :host {
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .col {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        background: var(--fw-sanft);
        border-radius: var(--se-r-lg);
        font-family: var(--se-font);
      }

      .head {
        flex: none;
        display: flex;
        align-items: center;
        gap: var(--se-gap-sm);
        padding: 10px 12px;
      }

      .dot {
        flex: none;
        width: 8px;
        height: 8px;
        background: var(--fw-stark);
      }

      .title {
        color: var(--se-ink);
        font-size: var(--se-fs);
        font-weight: 600;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .count {
        margin-left: auto;
        min-width: 22px;
        padding: 1px 8px;
        line-height: 1;
        border-radius: var(--se-r-sm);
        background: var(--se-panel);
        border: var(--se-border) solid var(--fw-stark);
        text-align: center;
        font-family: var(--se-mono);
        font-size: var(--se-fs-sm);
        font-weight: 600;
        color: var(--se-ink);
      }

      .body {
        padding: 0 10px 12px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }

    `,
  ]

  @property() variant: StatusVariant = 'info'
  @property() heading = 'Neue Spalte'
  @property() wert = ''

  @property({ attribute: false }) leerHinweis = ''

  @state() private _count = 0

  constructor() {
    super()

    this.addEventListener(ZIMMER_INHALT_EVENT, () => this.zaehle())
  }

  private zaehle(): void {
    this._count = Array.from(this.querySelectorAll(CardBlock.tagName))
      .filter((el) => !el.hasAttribute('data-ff-editor-helper'))
      .length
  }

  override render(): TemplateResult {
    const v = coerceStatusVariant(this.variant)
    return html`<div class="col ${ZIEL_KLASSE} v-${v}">
      <div class="head">
        <span class="dot"></span>
        <span
          class="title"
          data-ff-editable
          @dblclick=${(e: MouseEvent) => this.inlineEdit(e, 'heading')}
        >${this.heading}</span>
        <span class="count">${this._count}</span>
      </div>
      <div class="body">
        <slot @slotchange=${this.zaehle}></slot>
        ${leerZustand(this.leerHinweis)}
      </div>
    </div>`
  }
}

BasicBlock.defineAndRegister(KanbanSpalteBlock)
