import type { ActionChains } from '../data/actions'
import type { PropertyValue } from './property'

export interface BlockNode {
  id: string
  type: string
  values: Record<string, PropertyValue>

  chains?: ActionChains
  parentId: string | null
  childIds: string[]
}

export type MaskTree = Record<string, BlockNode>

export const ROOT_ID = 'root'
export const ROOT_TYPE = 'root'
