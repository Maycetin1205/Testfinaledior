// Die gemeinsame Grundlage jedes Bausteins: Anmeldung, Editor-Frage, Eigenschaften melden.
import { css, LitElement, type CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import type { BlockComponent, BlockComponentStatic } from '../../core/blocks/BlockComponent'
import type { PropertyDescription } from '../../core/blocks/PropertyDescription'
import { registerBlockType } from '../../core/blocks/blockRegistry'
import { hatFaehigkeit } from '../../core/blocks/faehigkeiten'
import { FLOW_DEFAULTS } from '../../core/blocks/flowLayout'
import { RASTER_DEFAULTS } from '../../core/blocks/rasterLayout'
import { AUSWAHL_FOLGE_DEFAULTS } from '../../core/data/auswahlFolge'
import { QUELLEN_DEFAULTS } from '../../core/data/sourceLinks'
import { starteUmbenennen } from '../shared/umbenennen'

// Maskenhaelfte der Anmeldung: aus der Klasse wird ein Element.
function definiere(BlockClass: BlockComponentStatic): void {
  if (!customElements.get(BlockClass.tagName)) {
    customElements.define(
      BlockClass.tagName,
      BlockClass as unknown as CustomElementConstructor,
    )
  }
}

// Editorhaelfte der Anmeldung: der Bausteintyp steht in der Registry.
function beschreibe(BlockClass: BlockComponentStatic): void {
  const faehig = { faehigkeiten: BlockClass.faehigkeiten ?? [] }
  registerBlockType({
    type: BlockClass.blockType,
    tagName: BlockClass.tagName,
    displayName: BlockClass.displayName,
    category: BlockClass.category,

    defaultProps: {
      ...FLOW_DEFAULTS,
      ...RASTER_DEFAULTS,
      ...(hatFaehigkeit(faehig, 'quelle') ? QUELLEN_DEFAULTS : null),

      ...(hatFaehigkeit(faehig, 'auswahlFolgen') ? AUSWAHL_FOLGE_DEFAULTS : null),
      ...BlockClass.defaultProps,
    },
    customProperties: BlockClass.customProperties,
    acceptsChildren: BlockClass.acceptsChildren ?? false,
    resizableWidth: BlockClass.resizableWidth ?? true,
    resizableHeight: BlockClass.resizableHeight ?? false,
    allowedChildTypes: BlockClass.allowedChildTypes,
    allowedParentTypes: BlockClass.allowedParentTypes,
    lockedWidth: BlockClass.lockedWidth,
    defaultChildren: BlockClass.defaultChildren,
    childDirection: BlockClass.childDirection,
    showInPalette: BlockClass.showInPalette,
    templateChild: BlockClass.templateChild,
    editorSlot: BlockClass.editorSlot,
    containerHint: BlockClass.containerHint,
    addChildButton: BlockClass.addChildButton,
    faehigkeiten: faehig.faehigkeiten,
    pageBlock: BlockClass.pageBlock,
    flaechenSeite: BlockClass.flaechenSeite,
    maskenRand: BlockClass.maskenRand,
    raster: BlockClass.raster,
  })
}

export abstract class BasicBlock extends LitElement implements BlockComponent {
  static override styles: CSSResultGroup = css`
    :host { display: block; }
    :host([hidden]) { display: none; }

    :host([fuellt]) { height: 100%; box-sizing: border-box; }
    [data-ff-editable] { cursor: text; }
    :host(:not([data-editable])) [data-ff-editable] { cursor: inherit; }
    :host([data-ff-editor]) [data-ff-bound] {
      text-decoration: underline dotted var(--se-accent);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
    :host([data-ff-editor][data-editable]) [data-ff-bound] { cursor: pointer; }
  `

  static readonly customProperties: PropertyDescription[] = []

  @property({ type: Boolean, reflect: true, attribute: 'data-editable' })
  editable = false

  get customProperties(): PropertyDescription[] {
    return (this.constructor as typeof BasicBlock).customProperties
  }

  // Steht der Baustein auf der Leinwand des Editors oder in der fertigen Maske?
  // Ein Name dafuer, geerbt von jedem Baustein.
  get imEditor(): boolean {
    return this.hasAttribute('data-ff-editor')
  }

  protected inlineEdit(event: MouseEvent, attr: string): void {
    if (!this.editable) return
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    if (target.hasAttribute('data-ff-bound')) return
    event.stopPropagation()
    event.preventDefault()
    starteUmbenennen(target, (neu, original) => {
      if (neu === original) return true
      const detail: { attr: string; value: string; abgelehnt?: boolean } = { attr, value: neu }
      this.dispatchEvent(new CustomEvent('ff-prop-change', {
        detail,
        bubbles: true,
        composed: true,
      }))
    // Der getippte Stand bleibt stehen, bis der Editor die Eigenschaft
    // zurueckgibt; hat er sie verworfen, muss der alte Text selbst wieder hin.
      return detail.abgelehnt !== true
    })
  }

  static defineAndRegister(BlockClass: BlockComponentStatic): void {
    definiere(BlockClass)
    beschreibe(BlockClass)
  }
}
