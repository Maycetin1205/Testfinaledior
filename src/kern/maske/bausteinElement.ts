import type { BausteinArt } from './bausteinArt'
import type { Eigenschaft } from './eigenschaft'

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
