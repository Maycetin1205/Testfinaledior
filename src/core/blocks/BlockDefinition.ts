// Was ein Bausteintyp dem Editor, dem Export und der Laufzeit ueber sich sagt.
import type { BlockCategory } from './BlockComponent'
import type { FlowDirection, FlowWidth } from './flowLayout'
import type { RasterSpec } from './rasterLayout'
import type {
  PropertyDescription,
  PropertyVisibilityCondition,
} from './PropertyDescription'

export type { BlockCategory }

export interface DefaultChildSpec {
  type: string
  props?: Record<string, unknown>
  children?: readonly DefaultChildSpec[]
}

export interface BindableSpot {
  prop: string
  label: string

  wenn?: PropertyVisibilityCondition

  vorschauProp?: string
}

export interface ActionValueSpot {
  prop: string
  label: string
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
import type { ListenBindung } from './listenBindung'

export type ActionValueSpotsFor<Props> = ReadonlyArray<{
  prop: keyof Props & string
  label: string
}>

export type BindingProp<P extends string = string> = `${P}Field`

export type BindingAttr = `${string}field`

export function bindingProp<P extends string>(prop: P): BindingProp<P> {
  return `${prop}Field`
}

export function bindingAttr(prop: string): BindingAttr {
  return `${prop.toLowerCase()}field`
}

export {
  bindungMitQuelle,
  QUELLEN_TRENNER,
  zerlegeBindung,
  type FeldZiel,
} from './bindung'

export type BindableSpotProp<Props> = keyof Props extends infer K
  ? K extends BindingProp<infer P> ? P : never
  : never

export type BindableSpotsFor<Props> = ReadonlyArray<
  Omit<BindableSpot, 'prop' | 'vorschauProp'> & {
    prop: BindableSpotProp<Props>
    vorschauProp?: keyof Props & string
  }
>

export interface BlockEventSpec {
  key: string
  name: string
}

// Der Baustein gibt eine gewaehlte oder angezeigte Zeile her. `wenn` schaltet
// dabei NICHT die Faehigkeit, sondern waehlt nur die Quell-Eigenschaft.
export interface SatzWahl {
  quelleProp?: string

  wenn?: PropertyVisibilityCondition
}

export type QuellenFaehigkeit = boolean | { wenn: PropertyVisibilityCondition }

// Das Nachschlage-Fenster einer Stelle: WO seine Spalten und sein Mass stehen.
// Eingestellt wird es im Inspector, der Baustein haelt nur die Eigenschaften und
// liest sie beim Oeffnen.
export interface SuchFenster {
  // Ohne Angabe hat der Baustein EIN Fenster in seinen eigenen Eigenschaften.
  // Mit ihr hat jeder Eintrag dieser Liste eines (die Spalten der Erfassung).
  eintraegeProp?: string

  spaltenKey: string

  breiteKey: string

  hoeheKey: string

  // Woher die Felder des Fensters kommen: eine Quellen-Eigenschaft am Baustein
  // oder die Bindung in diesem Schluessel des Eintrags. Die Bindung im Eintrag
  // traegt das gespeicherte Feld gleich mit; am Baustein steht es woanders.
  quelleProp?: string
  quelleKey?: string

  speicherFeldProp?: string
  speicherTitelProp?: string

  // Die Ueberschrift eines Eintrags-Fensters.
  titelKey?: string

  // Was ohne gestellte Spalten geschieht, in Worten fuer den Bauer.
  automatik: string

  // CSS-Auswahl der Stelle im Baustein, deren Klick die Sektion aufmacht (die
  // Lupe). Der Wirt faengt den Klick ab; der Baustein zeichnet dafuer nichts.
  stelle?: string

  wenn?: PropertyVisibilityCondition
}

// Die Faehigkeit „Erfassungszeile": der Baustein nimmt neue Zeilen entgegen,
// bevor sie im ERP existieren. Editor, Export und Laufzeit lesen dieselbe
// Deklaration.
export interface ErfassungsFaehigkeit {
  wenn?: PropertyVisibilityCondition
}

// Die drei Vormerk-Listen. Ueber diese Vokabel reden Kette, Baustein und
// Statusbalken; der Ketten-Lauf kennt keinen Bausteintyp.
export type VormerkArt = 'erfasst' | 'geaendert' | 'geloescht'

// Der Laufzeit-Vertrag eines Bausteins mit dieser Faehigkeit. Rein als Typ: die
// Laufzeit findet den Baustein ueber data-ff-block-id, nie ueber einen Import.
// erfassteSchluessel steht Platz fuer Platz neben erfassteZeilen, denn der PLATZ
// taugt nicht als Kennung.
export interface ErfassungsTraegerElement {
  erfassteZeilen: readonly (readonly string[])[]
  erfassteSchluessel: readonly string[]
}

// Und derselbe fuer Zeilen, die WEG sollen. Die Werte reisen mit, weil eine
// Loesch-Relation mehr als die Satznummer verlangen kann.
export interface LoeschTraegerElement {
  geloeschteZeilen: readonly { satz: string; werte: readonly string[] }[]
}

// Derselbe Vertrag fuer GEAENDERTE Zeilen: je Zeile ihre Satznummer und die
// Werte aller Spalten, mit der Aenderung darin.
export interface AenderungsTraegerElement {
  geaenderteZeilen: readonly { satz: string; werte: readonly string[] }[]
}

// Was eine Lieferung von SoftEngine ueber ihre Zeilen sagt, ohne dass der
// Baustein die Quelle kennt.
export interface Lieferung {
  zeilen: readonly unknown[]

  satzVon: (zeile: unknown) => string

  lies: (zeile: unknown, feld: string) => string
}

// Der Laufzeit-Vertrag der Faehigkeit `haeltGesendete`: der Baustein haelt die
// Zeilen, die er ans ERP gesendet hat, und laesst jede erst los, wenn sie in
// einer Lieferung wieder auftaucht. null = keine Quelle, dann ist nichts zu
// beweisen.
export interface GesendeteZeilenElement {
  pruefeAnkunft: (lieferung: Lieferung | null) => void
}

// Was von einer abgearbeiteten Zeile uebrig bleibt: ihre Kennung im Bericht und
// die Satznummer, mit der sie wirklich hinausging. Ohne die zweite waere eine
// neue Position in der naechsten Lieferung nur noch ueber ihre Felder zu finden.
export interface GeschriebeneZeile {
  schluessel: string

  satz: string
}

// Der Bericht des Ketten-Laufs an den Baustein, dessen Liste er abarbeitet.
// Ohne ihn waere ein Lauf alles-oder-nichts: ein Fehler in Zeile 3 von 10 naehme
// auch den Vormerkungen 4-10 ihre Chance. laufFertig kommt erst, wenn ALLE
// Abschnitte durch sind.
export interface LaufBerichtElement {
  zeileSchreibt: (art: VormerkArt, schluessel: string) => void
  zeileGescheitert: (art: VormerkArt, schluessel: string, meldung: string) => void
  laufFertig: (art: VormerkArt, geschrieben: readonly GeschriebeneZeile[]) => void
}

export interface BlockDefinition {
  type: string
  tagName: string
  displayName: string
  category: BlockCategory
  defaultProps: Record<string, unknown>
  customProperties: PropertyDescription[]
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

  acceptsDataSource?: QuellenFaehigkeit

  satzWahl?: SatzWahl

  kannAuswahlFolgen?: boolean

  kannErfassen?: ErfassungsFaehigkeit

  kannLoeschen?: ErfassungsFaehigkeit

  // Gesetzt heisst: dieser Baustein traegt Berechnungen (Produktgleichungen
  // ueber seine Spalten). In welcher Eigenschaft sie stehen, sagt die Registry,
  // damit Export und Inspector keinen Bausteintyp kennen muessen.
  rechenGruppen?: { prop: string }

  suchFenster?: SuchFenster

  // Gesetzt heisst: dieser Baustein kann einer Kette die GEAENDERTEN Zeilen
  // geben. Welcher das ist, steht damit in der Registry und nicht im Ketten-Code.
  aenderungsSchluessel?: string

  // Gesetzt heisst: dieser Baustein haelt gesendete Zeilen und laesst sie erst
  // los, wenn eine Lieferung sie zeigt. Steht in der Registry, damit der
  // Datenstrom nicht am Element nach einer Methode fragen muss.
  haeltGesendete?: boolean

  bindableSpots?: readonly BindableSpot[]

  actionValueSpots?: readonly ActionValueSpot[]

  listenBindung?: ListenBindung

  blockEvents?: readonly BlockEventSpec[]

  pageBlock?: boolean

  flaechenSeite?: boolean

  maskenRand?: boolean

  raster?: Partial<RasterSpec>
}
