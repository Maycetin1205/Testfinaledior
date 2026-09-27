import type { Capability, ContractClasses } from './capability'
import type { Direction, FlowWidth } from './flow'
import type { GridMetrics } from './grid'
import type { PropertyMap, PropertyValue } from './property'

export {
  fieldChoicesRead,
  listDefaultTitle,
  flagOn,
  flagFor,
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
  fixedWidth?: FlowWidth
  childDefaults?: readonly ChildDefault[]
  childDirection?: Direction
  inPalette?: boolean

  // A selector in the shadow root: the part at the top that stays free when the
  // bar has to lie inside the block, the row of column heads of a table. A
  // block without one takes the bar on its own top edge.
  head?: string

  templateKind?: { type: string; name: string; direction?: Direction }
  containerFrame?: boolean

  childButton?: { name: string; childType: string; nameFromField?: string }
  page?: boolean

  gridArea?: boolean
  grid?: Partial<GridMetrics>
}

// The registry fills in what a block left open, so readers never test for it.
export type BlockType = BlockDeclaration & Required<Pick<
  BlockDeclaration,
  'properties' | 'capabilities' | 'takesChildren'
>>
