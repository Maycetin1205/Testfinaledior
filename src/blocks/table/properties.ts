import type { ValuesOf } from '../../core/block/property'
import { listProperties } from '../list/listDeclaration'

export const tableProperties = listProperties(true)

export type TableValues = ValuesOf<typeof tableProperties>
