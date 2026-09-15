import type { BausteinArt } from './bausteinArt'
import type { Eigenschaft } from './eigenschaft'

export type Kategorie = 'eingabe' | 'anzeige' | 'layout'

export interface BausteinElement {
  get eigenschaften(): Eigenschaft[]
}

type KlassenAngaben =
  // anzeigeName statt name: eine Klasse hat schon Function.name, den Klassennamen.
  Omit<BausteinArt, 'typ' | 'name' | 'faehigkeiten' | 'nimmtKinder' | 'breiteAenderbar' | 'hoeheAenderbar'>
  & { anzeigeName: string }
  & Partial<Pick<BausteinArt, 'faehigkeiten' | 'nimmtKinder' | 'breiteAenderbar' | 'hoeheAenderbar'>>

export interface BausteinKlasse extends Readonly<KlassenAngaben> {
  readonly typ: string
  new(): BausteinElement
}
