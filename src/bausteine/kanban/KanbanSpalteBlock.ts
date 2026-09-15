// Baustein Kanban-Spalte: eine Bahn der Tafel, Ziel eines gezogenen Kaertchens.
import { css, html, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { Grundbaustein } from '../grund/Grundbaustein'
import type { Kategorie } from '../../kern/maske/bausteinElement'
import type { Richtung, FlussBreite } from '../../kern/maske/fluss'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
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

export class KanbanSpalteBlock extends Grundbaustein {
  static readonly typ = 'kanban-spalte'
  static readonly tag = 'ff-kanban-spalte'
  static readonly anzeigeName = 'Kanban-Spalte'
  static readonly kategorie: Kategorie = 'anzeige'
  static readonly nimmtKinder = true

  static readonly erlaubteKinder: string[] = [
    KanbanZimmerBlock.typ,
  ]

  static readonly kindKnopf = { label: 'Zimmer', childType: KanbanZimmerBlock.typ }
  static readonly kinderRichtung: Richtung = 'column'
  static readonly inPalette = false
  static readonly behaelterRahmen = false

  static readonly erlaubteEltern = ['kanban']
  static readonly festeBreite: FlussBreite = 'fill'
  static readonly breiteAenderbar = false

  static readonly vorgaben = {
    variant: 'info',
    heading: 'Neue Spalte',
    wert: '',
    auffang: 'nein',
    zimmerField: '',
  }

  static override readonly eigenschaften: Eigenschaft[] = [
    statusVariantProperty(
      'variant',
      'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Rahmen).',
    ),
    jaNeinProperty(
      'auffang',
      'Auffangspalte',
      'Eintr\u00E4ge ohne passenden Wert landen hier.',
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
      schluessel: 'zimmerField',
      name: 'Unterteilen nach',
      beschreibung: 'Wähle das Datenfeld für die Zimmer, z. B. Mitarbeiter oder Raum. Trage an jedem Zimmer den passenden ERP-Wert ein. Unbekannte Werte landen im ersten Zimmer.',
      art: 'field',
    },
  ]

  static override styles = [
    Grundbaustein.styles,
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
    this._count = Array.from(this.querySelectorAll(CardBlock.tag))
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

Grundbaustein.defineAndRegister(KanbanSpalteBlock)
