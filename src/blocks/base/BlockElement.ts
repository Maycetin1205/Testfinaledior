import { css, LitElement, type CSSResultGroup, type PropertyDeclaration } from 'lit'
import { property } from 'lit/decorators.js'
import type { BlockDeclaration } from '../../core/block/blockType'
import { capability, hasCapability } from '../../core/block/capability'
import type { PropertyMap, PropertyValue } from '../../core/block/property'
import { registerBlockType } from '../../core/block/registry'
import { GRID_PROPERTIES } from '../../core/block/grid'
import { SOURCE_PROP, SOURCE_PROPERTY } from '../../core/block/sourceProperty'
import { deepClone } from '../../core/deepClone'
import { followsSelectionProperty } from '../../core/data/selectionFollow'
import { extraSourcesProperty } from '../../core/data/extraSources'
import { startRename } from './inlineRename'

// What a block states beyond its element: name, category, properties and
// everything the editor needs. Type and tag stay on the class, where the
// element and the other blocks read them.
type BlockShape = Omit<BlockDeclaration, 'type' | 'tag'>

interface BlockElementClass {
  readonly type: string
  readonly tag: string
  declaredProperties: PropertyMap
  createProperty(name: PropertyKey, options: PropertyDeclaration): void
  new(): BlockElement
}

// The block's own properties, with the source where its capability puts it.
function ownProperties(shape: BlockShape): PropertyMap {
  const own = Object.entries(shape.properties ?? {})
  const source = capability({ capabilities: shape.capabilities ?? [] }, 'source')
  if (!source) return Object.fromEntries(own)
  const at = own.findIndex(([key]) => key === source.after) + 1
  return Object.fromEntries([...own.slice(0, at), [SOURCE_PROP, SOURCE_PROPERTY], ...own.slice(at)])
}

function allProperties(shape: BlockShape): PropertyMap {
  const capable = { capabilities: shape.capabilities ?? [] }
  return {
    ...GRID_PROPERTIES,
    ...(hasCapability(capable, 'source') ? { extraSources: extraSourcesProperty } : null),
    ...(hasCapability(capable, 'followsSelection')
      ? { followsSelection: followsSelectionProperty }
      : null),
    ...ownProperties(shape),
  }
}

function declareLitProperties(element: BlockElementClass, properties: PropertyMap): void {
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

// A block asks the editor to store a new value of one of its properties: the
// editor owns the tree. The event stays at the element.
export const PROP_CHANGE = 'ff-prop-change'

export interface PropChange {
  prop: string
  value: unknown
}

export function sendPropChange(el: HTMLElement, prop: string, value: unknown): void {
  el.dispatchEvent(new CustomEvent<PropChange>(PROP_CHANGE, { detail: { prop, value } }))
}

// A click in the editor on a spot the editor answers: a spot it binds to a
// field, the spot that opens the block's lookup window, or the spot that
// opens an area. The block says which spot and where it stands, the editor
// decides what opens. The event stays at the element and carries the click
// it reports.
export const SPOT_CLICK = 'ff-spot-click'

export type SpotClick =
  | { kind: 'binding'; click: MouseEvent; prop: string; rect: DOMRect }
  | { kind: 'lookupWindow'; click: MouseEvent }
  | { kind: 'opener'; click: MouseEvent }

export function sendSpotClick(el: BlockElement, detail: SpotClick): void {
  if (el.preview) el.dispatchEvent(new CustomEvent<SpotClick>(SPOT_CLICK, { detail }))
}

function startValues(properties: PropertyMap): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  for (const [name, declared] of Object.entries(properties)) {
    if (declared.attribute === '') continue
    out[name] = deepClone(declared.default) as PropertyValue
  }
  return out
}

export abstract class BlockElement extends LitElement {
  // Filled by defineBlock; every block reads its own declaration from here.
  static declaredProperties: PropertyMap = {}

  static override styles: CSSResultGroup = css`
    :host { display: block; }
    :host([hidden]) { display: none; }

    :host([fills]) { height: 100%; box-sizing: border-box; }
    [data-ff-editable] { cursor: text; }
    :host(:not([data-editable])) [data-ff-editable] { cursor: inherit; }
    :host([preview]) [data-ff-bound] {
      text-decoration: underline dotted var(--se-accent);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
    :host([preview][data-editable]) [data-ff-bound] { cursor: pointer; }
  `

  @property({ type: Boolean, reflect: true, attribute: 'data-editable' })
  editable = false

  // The one switch between editor and mask, set once by the editor before the
  // block connects. It changes what the block shows, not where its data comes from.
  @property({ type: Boolean, reflect: true })
  preview = false

  constructor() {
    super()
    Object.assign(this, startValues(this.properties))
  }

  get properties(): PropertyMap {
    return (this.constructor as typeof BlockElement).declaredProperties
  }

  // The tree's own value, not the one read from it: a list the editor did not
  // change keeps its identity, so lit sees no change and the list keeps its widths.
  setDeclared(name: string, value: unknown): void {
    if (!Object.hasOwn(this.properties, name) || !this.properties[name].type.read(value).ok) return
    Object.assign(this, { [name]: value })
  }

  // A bindable spot names itself in data-ff-spot; its clicks and double clicks
  // go to the editor.
  protected reportSpot(event: MouseEvent): void {
    const at = event.currentTarget
    if (!(at instanceof HTMLElement) || at.dataset.ffSpot === undefined) return
    sendSpotClick(this, { kind: 'binding', click: event, prop: at.dataset.ffSpot, rect: at.getBoundingClientRect() })
  }

  protected inlineEdit(event: MouseEvent, prop: string): void {
    if (!this.editable) return
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    if (target.hasAttribute('data-ff-bound')) return
    event.stopPropagation()
    event.preventDefault()
    startRename(target, (text, original) => {
      if (text !== original) sendPropChange(this, prop, text)
    })
  }
}

export function defineBlock(element: BlockElementClass, shape: BlockShape): void {
  const properties = allProperties(shape)
  element.declaredProperties = properties
  declareLitProperties(element, properties)
  if (!customElements.get(element.tag)) customElements.define(element.tag, element)
  registerBlockType({ ...shape, type: element.type, tag: element.tag, properties })
}
