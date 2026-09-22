import type { Category } from './blockClass'
import type { Capability } from './capability'
import type { Direction, FlowWidth } from './flow'
import type { GridMetrics } from './grid'
import type { PropertyMap, PropertyValue } from './property'

export type { Category }

export interface ChildDefault {
  type: string
  values?: Record<string, PropertyValue>
  children?: readonly ChildDefault[]
}

export {
  fieldChoicesRead,
  typedTitle,
  listStandardTitle,
  listForExport,
  listRead,
  flagOn,
  flagFor,
  titleToFieldChoice,
  type EntryFieldChoice,
  type EntrySwitch,
  type ListBinding,
} from './listBinding'

export {
  bindingWithSource,
  SOURCES_DIVIDER,
  splitBinding,
  type FieldTarget,
} from './binding'

export interface BlockType {
  type: string
  tag: string
  name: string
  category: Category
  properties: PropertyMap

  capabilities: readonly Capability[]

  takesChildren: boolean
  widthEditable: boolean
  heightEditable: boolean
  allowedChildren?: readonly string[]
  allowedParent?: readonly string[]
  fixedWidth?: FlowWidth
  childDefaults?: readonly ChildDefault[]
  childDirection?: Direction
  inPalette?: boolean

  templateKind?: { type: string; name: string; direction?: Direction }
  containerFrame?: boolean

  childButton?: { name: string; childType: string; nameFromField?: string }
  page?: boolean

  gridArea?: boolean
  grid?: Partial<GridMetrics>
}
