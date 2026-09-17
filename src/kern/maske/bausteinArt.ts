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
  getippterTitel,
  listenStandardTitel,
  listeFuerExport,
  listeLesen,
  schalterAn,
  schalterFuer,
  titelNachFeldwahl,
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
  // Die eine Vorlage, nach der eine Tafel ihre Laufzeitkinder baut. Der Export
  // macht aus ihr ein <template>, der Editor zeigt sie an ihrem Platz.
  // `richtung`: wie die FERTIGEN Kinder stapeln — eine Karte haengt an der
  // Tafel, liegt aber in einer Spalte, und danach richtet sich ihr Mass.
  musterKind?: { typ: string; name: string; richtung?: Richtung }
  behaelterRahmen?: boolean
  // nameAusFeld: der Knopf heisst wie das Feld in dieser Eigenschaft, sobald
  // eines gewaehlt ist — sonst wie `name`.
  kindKnopf?: { name: string; kindTyp: string; nameAusFeld?: string }
  seite?: boolean
  // Der Baustein spannt selbst ein Raster auf: seine Kinder sitzen in Zellen
  // statt im Fluss. Wurzel und Seiten tun das ohnehin (rasterFlaeche.ts).
  rasterFlaeche?: boolean
  raster?: Partial<RasterMass>
}
