import type { Capability, ContractClasses } from './capability'
import type { GridMetrics } from './grid'
import type { PropertyMap, PropertyValue } from './property'

export {
  entriesWithValue,
  entryPathFrom,
  entryValues,
  fieldChoicesRead,
  innerOf,
  listDefaultTitle,
  flagOn,
  flagFor,
  withInner,
  type EntryPath,
  type ListBinding,
} from './listBinding'

export {
  bindingWithSource,
  SOURCES_DIVIDER,
  splitBinding,
} from './binding'

export type Category = 'input' | 'display' | 'layout'

export interface ChildDefault {
  type: string
  values?: Record<string, PropertyValue>
  children?: readonly ChildDefault[]
}

// Everything a block states about itself. The registry keeps this, the editor
// and the export read it; nothing about a block is written down twice.
export interface BlockDeclaration {
  type: string
  tag: string
  name: string
  category: Category

  properties?: PropertyMap
  capabilities?: readonly Capability[]
  contracts?: ContractClasses

  takesChildren?: boolean

  allowedChildren?: readonly string[]
  allowedParent?: readonly string[]
  inPalette?: boolean

  // A selector in the shadow root: the part at the top that stays free when the
  // bar has to lie inside the block, the row of column heads of a table. A
  // block without one takes the bar on its own top edge.
  head?: string

  containerFrame?: boolean

  page?: boolean

  gridArea?: boolean
  grid?: Partial<GridMetrics>
}

// The registry fills in what a block left open, so readers never test for it.
export type BlockType = BlockDeclaration & Required<Pick<
  BlockDeclaration,
  'properties' | 'capabilities' | 'takesChildren'
>>
