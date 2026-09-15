import type { BlockDefinition } from './BlockDefinition'
import type { PropertyDescription } from './PropertyDescription'

export type BlockCategory = 'eingabe' | 'anzeige' | 'layout'

export interface BlockComponent {
  get customProperties(): PropertyDescription[]
}

type KlassenAngaben =
  Omit<BlockDefinition, 'type' | 'faehigkeiten' | 'acceptsChildren' | 'resizableWidth' | 'resizableHeight'>
  & Partial<Pick<BlockDefinition, 'faehigkeiten' | 'acceptsChildren' | 'resizableWidth' | 'resizableHeight'>>

export interface BlockComponentStatic extends Readonly<KlassenAngaben> {
  readonly blockType: string
  new(): BlockComponent
}
