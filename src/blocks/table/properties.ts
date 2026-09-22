import type { ValuesOf } from '../../core/block/property'
import { listProperties } from '../behavior/listDeclaration'

export const tableProperties = listProperties()

export type TableValues = ValuesOf<typeof tableProperties>
