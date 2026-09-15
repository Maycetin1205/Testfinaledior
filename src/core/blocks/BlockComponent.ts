import type { BausteinArt } from './BlockDefinition'
import type { Eigenschaft } from './PropertyDescription'

export type Kategorie = 'eingabe' | 'anzeige' | 'layout'

export interface BausteinElement {
  get customProperties(): Eigenschaft[]
}

type KlassenAngaben =
  Omit<BausteinArt, 'type' | 'faehigkeiten' | 'acceptsChildren' | 'resizableWidth' | 'resizableHeight'>
  & Partial<Pick<BausteinArt, 'faehigkeiten' | 'acceptsChildren' | 'resizableWidth' | 'resizableHeight'>>

export interface BausteinKlasse extends Readonly<KlassenAngaben> {
  readonly blockType: string
  new(): BausteinElement
}
