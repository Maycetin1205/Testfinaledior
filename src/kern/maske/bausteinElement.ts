import type { BausteinArt } from './bausteinArt'
import type { Eigenschaft } from './eigenschaft'

export type Kategorie = 'eingabe' | 'anzeige' | 'layout'

export interface BausteinElement {
  get eigenschaften(): Eigenschaft[]
}

type KlassenAngaben =
  Omit<BausteinArt, 'typ' | 'faehigkeiten' | 'nimmtKinder' | 'breiteAenderbar' | 'hoeheAenderbar'>
  & Partial<Pick<BausteinArt, 'faehigkeiten' | 'nimmtKinder' | 'breiteAenderbar' | 'hoeheAenderbar'>>

export interface BausteinKlasse extends Readonly<KlassenAngaben> {
  readonly typ: string
  new(): BausteinElement
}
