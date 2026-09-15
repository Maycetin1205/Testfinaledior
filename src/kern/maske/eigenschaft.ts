// Wie eine Baustein-Eigenschaft im Inspector aussieht und was sie speichert.
export type EigenschaftsArt =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'segment'
// jaNein ist eine eigene Art und kein segment mit zwei Optionen: der Inspector
// zeichnet eine Kachel statt einer Zeile. Gespeichert werden weiter die zwei
// Zeichenketten, damit exportierte Masken unveraendert bleiben.
  | 'jaNein'
  | 'field'
// quelle speichert die id einer Datenquelle: eine ZWEITE Quelle am Baustein
// neben der, aus der er seinen Inhalt liest. Der Export sammelt sie mit in die
// SEFILELOOP, sonst bliebe das Fenster in der fertigen Maske leer.
  | 'quelle'
  | 'relation'
// seite speichert die feste Kennung. klarnameProp haelt den lesbaren Seitennamen.
  | 'seite'


export interface Wahloption {
  wert: string
  name: string
// Traegt die Option eine Farbe, zeichnet der Inspector Kacheln statt einer
// Liste — aber nur, wenn ALLE Optionen eine haben. Der Wert ist fertiges CSS.
  farbe?: string
}

export interface Bedingung {
  schluessel: string

  gleich?: unknown
  ungleich?: unknown

  keinesVon?: readonly unknown[]
}

export function eigenschaftSichtbar(
  bedingung: Bedingung | undefined,
  props: Record<string, unknown>,
): boolean {
  if (!bedingung) return true
  const wert = props[bedingung.schluessel]
  if (bedingung.keinesVon) {
    return !bedingung.keinesVon.some((v) => Object.is(wert, v))
  }
  if ('ungleich' in bedingung) {
    return !Object.is(wert, bedingung.ungleich)
  }
  return Object.is(wert, bedingung.gleich)
}

export interface Eigenschaft {
  schluessel: string
  name: string
  beschreibung: string
  maxLaenge?: number
  art: EigenschaftsArt
  optionen?: Wahloption[]

  einheit?: string
  min?: number
  max?: number

  bearbeitung?: 'inline' | 'inspector'

  zeile?: string
  wenn?: Bedingung
  brauchtQuelle?: boolean
  einzigUnterGeschwistern?: boolean

  quelleProp?: string

  klarnameProp?: string

  nurImEditor?: boolean
}
