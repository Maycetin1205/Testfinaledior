// Was ein Bausteintyp dem Editor, dem Export und der Laufzeit ueber sich sagt.
import type { BlockCategory } from './BlockComponent'
import type { Faehigkeit } from './faehigkeiten'
import type { FlowDirection, FlowWidth } from './flowLayout'
import type { RasterSpec } from './rasterLayout'
import type { PropertyDescription } from './PropertyDescription'

export type { BlockCategory }

export interface DefaultChildSpec {
  type: string
  props?: Record<string, unknown>
  children?: readonly DefaultChildSpec[]
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

export interface BlockDefinition {
  type: string
  tagName: string
  displayName: string
  category: BlockCategory
  defaultProps: Record<string, unknown>
  customProperties: PropertyDescription[]

  // Was der Baustein ueber Anzeige und Layout hinaus kann (faehigkeiten.ts).
  faehigkeiten: readonly Faehigkeit[]

  acceptsChildren: boolean
  resizableWidth: boolean
  resizableHeight: boolean
  allowedChildTypes?: readonly string[]
  allowedParentTypes?: readonly string[]
  lockedWidth?: FlowWidth
  defaultChildren?: readonly DefaultChildSpec[]
  childDirection?: FlowDirection
  showInPalette?: boolean
  templateChild?: { type: string; label: string }
  editorSlot?: string
  containerHint?: boolean
  addChildButton?: { label: string; childType: string }
  pageBlock?: boolean
  flaechenSeite?: boolean
  maskenRand?: boolean
  raster?: Partial<RasterSpec>
}
