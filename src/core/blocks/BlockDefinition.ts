// Was ein Bausteintyp dem Editor, dem Export und der Laufzeit ueber sich sagt.
import type { Kategorie } from './BlockComponent'
import type { Faehigkeit } from './faehigkeiten'
import type { Richtung, FlussBreite } from './flowLayout'
import type { RasterMass } from './rasterLayout'
import type { Eigenschaft } from './PropertyDescription'

export type { Kategorie }

export interface KindVorgabe {
  type: string
  props?: Record<string, unknown>
  children?: readonly KindVorgabe[]
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
  type: string
  tagName: string
  displayName: string
  category: Kategorie
  defaultProps: Record<string, unknown>
  customProperties: Eigenschaft[]

  // Was der Baustein ueber Anzeige und Layout hinaus kann (faehigkeiten.ts).
  faehigkeiten: readonly Faehigkeit[]

  acceptsChildren: boolean
  resizableWidth: boolean
  resizableHeight: boolean
  allowedChildTypes?: readonly string[]
  allowedParentTypes?: readonly string[]
  lockedWidth?: FlussBreite
  defaultChildren?: readonly KindVorgabe[]
  childDirection?: Richtung
  showInPalette?: boolean
  templateChild?: { type: string; label: string }
  editorSlot?: string
  containerHint?: boolean
  addChildButton?: { label: string; childType: string }
  pageBlock?: boolean
  flaechenSeite?: boolean
  maskenRand?: boolean
  raster?: Partial<RasterMass>
}
