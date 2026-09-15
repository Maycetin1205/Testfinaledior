// Was ein Bausteintyp dem Editor, dem Export und der Laufzeit ueber sich sagt.
import type { Kategorie } from './bausteinElement'
import type { Faehigkeit } from './faehigkeiten'
import type { Richtung, FlussBreite } from './fluss'
import type { RasterMass } from './raster'
import type { Eigenschaft } from './eigenschaft'

export type { Kategorie }

export interface KindVorgabe {
  typ: string
  werte?: Record<string, unknown>
  kinder?: readonly KindVorgabe[]
}

export {
  feldWahlenLesen,
  listenStandardTitel,
  listeFuerExport,
  listeLesen,
  schalterAn,
  schalterFuer,
  type EintragsFeldWahl,
  type EintragsSchalter,
  type ListenBindung,
} from './listenBindung'

export {
  bindungMitQuelle,
  QUELLEN_TRENNER,
  zerlegeBindung,
  type FeldZiel,
} from './bindung'

export interface BausteinArt {
  typ: string
  tag: string
  name: string
  kategorie: Kategorie
  vorgaben: Record<string, unknown>
  eigenschaften: Eigenschaft[]

  // Was der Baustein ueber Anzeige und Layout hinaus kann (faehigkeiten.ts).
  faehigkeiten: readonly Faehigkeit[]

  nimmtKinder: boolean
  breiteAenderbar: boolean
  hoeheAenderbar: boolean
  erlaubteKinder?: readonly string[]
  erlaubteEltern?: readonly string[]
  festeBreite?: FlussBreite
  kinderVorgabe?: readonly KindVorgabe[]
  kinderRichtung?: Richtung
  inPalette?: boolean
  musterKind?: { type: string; label: string }
  editorPlatz?: string
  behaelterRahmen?: boolean
  kindKnopf?: { label: string; childType: string }
  seite?: boolean
  flaechenSeite?: boolean
  maskenRand?: boolean
  raster?: Partial<RasterMass>
}
