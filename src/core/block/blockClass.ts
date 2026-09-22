import type { BlockType } from './blockType'
import type { PropertyMap } from './property'

export type Category = 'input' | 'display' | 'layout'

export interface BlockElementContract {
  get properties(): PropertyMap
}

type ClassesFacts =

  Omit<BlockType, 'type' | 'name' | 'capabilities' | 'takesChildren' | 'widthEditable' | 'heightEditable' | 'properties'>
  & { displayName: string }
  & { blockProperties?: PropertyMap }
  & Partial<Pick<BlockType, 'capabilities' | 'takesChildren' | 'widthEditable' | 'heightEditable'>>

export interface BlockClass extends Readonly<ClassesFacts> {
  readonly type: string
  new(): BlockElementContract
}
