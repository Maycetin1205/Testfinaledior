import { css, LitElement, type CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import type { BlockElementContract, BlockClass } from '../../core/block/blockClass'
import type { PropertyMap } from '../../core/block/property'
import { registerBlockType } from '../../core/block/registry'
import { hasCapability } from '../../core/block/capability'
import { widthProperty } from '../../core/block/flow'
import { GRID_PROPERTIES } from '../../core/block/grid'
import { followsSelectionProperty } from '../../core/data/selectionFollow'
import { extraSourcesProperty } from '../../core/data/extraSources'
import { startRename } from './inlineRename'

// What every block carries, whatever it shows.
function allProperties(BlockClass: BlockClass): PropertyMap {
  const capable = { capabilities: BlockClass.capabilities ?? [] }
  return {
    width: widthProperty,
    ...GRID_PROPERTIES,
    ...(hasCapability(capable, 'source') ? { extraSources: extraSourcesProperty } : null),
    ...(hasCapability(capable, 'followsSelection')
      ? { followsSelection: followsSelectionProperty }
      : null),
    ...BlockClass.blockProperties,
  }
}

function define(BlockClass: BlockClass): void {
  if (!customElements.get(BlockClass.tag)) {
    customElements.define(
      BlockClass.tag,
      BlockClass as unknown as CustomElementConstructor,
    )
  }
}

// The mask half: every declared property becomes a lit property with the
// converter its declaration carries.
function declareLitProperties(BlockClass: BlockClass, properties: PropertyMap): void {
  const element = BlockClass as unknown as typeof LitElement
  for (const [name, declared] of Object.entries(properties)) {
    if (declared.attribute === '') continue
    element.createProperty(name, {
      attribute: declared.attribute,
      converter: {
        fromAttribute: (raw: string | null) => declared.type.fromAttribute(raw, declared.default),
        toAttribute: (value: never) => declared.type.toAttribute(value),
      },
    })
  }
}

function describe(BlockClass: BlockClass, properties: PropertyMap): void {
  registerBlockType({
    type: BlockClass.type,
    tag: BlockClass.tag,
    name: BlockClass.displayName,
    category: BlockClass.category,
    properties,
    takesChildren: BlockClass.takesChildren ?? false,
    widthEditable: BlockClass.widthEditable ?? true,
    heightEditable: BlockClass.heightEditable ?? false,
    allowedChildren: BlockClass.allowedChildren,
    allowedParent: BlockClass.allowedParent,
    fixedWidth: BlockClass.fixedWidth,
    childDefaults: BlockClass.childDefaults,
    childDirection: BlockClass.childDirection,
    inPalette: BlockClass.inPalette,
    templateKind: BlockClass.templateKind,
    containerFrame: BlockClass.containerFrame,
    childButton: BlockClass.childButton,
    capabilities: BlockClass.capabilities ?? [],
    page: BlockClass.page,
    gridArea: BlockClass.gridArea,
    grid: BlockClass.grid,
  })
}

export abstract class BlockElement extends LitElement implements BlockElementContract {
  static override styles: CSSResultGroup = css`
    :host { display: block; }
    :host([hidden]) { display: none; }

    :host([fills]) { height: 100%; box-sizing: border-box; }
    [data-ff-editable] { cursor: text; }
    :host(:not([data-editable])) [data-ff-editable] { cursor: inherit; }
    :host([data-ff-editor]) [data-ff-bound] {
      text-decoration: underline dotted var(--se-accent);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
    :host([data-ff-editor][data-editable]) [data-ff-bound] { cursor: pointer; }
  `

  @property({ type: Boolean, reflect: true, attribute: 'data-editable' })
  editable = false

  get properties(): PropertyMap {
    return (this.constructor as { blockProperties?: PropertyMap }).blockProperties ?? {}
  }

  get inEditor(): boolean {
    return this.hasAttribute('data-ff-editor')
  }

  protected inlineEdit(event: MouseEvent, attr: string): void {
    if (!this.editable) return
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    if (target.hasAttribute('data-ff-bound')) return
    event.stopPropagation()
    event.preventDefault()
    startRename(target, (next, original) => {
      if (next === original) return true
      const detail: { attr: string; value: string; rejected?: boolean } = { attr, value: next }
      this.dispatchEvent(new CustomEvent('ff-prop-change', {
        detail,
        bubbles: true,
        composed: true,
      }))

      return detail.rejected !== true
    })
  }

  static defineAndRegister(BlockClass: BlockClass): void {
    const properties = allProperties(BlockClass)
    declareLitProperties(BlockClass, properties)
    define(BlockClass)
    describe(BlockClass, properties)
  }
}
