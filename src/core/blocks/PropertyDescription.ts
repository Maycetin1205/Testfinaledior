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
  value: string
  label: string
// Traegt die Option eine Farbe, zeichnet der Inspector Kacheln statt einer
// Liste — aber nur, wenn ALLE Optionen eine haben. Der Wert ist fertiges CSS.
  farbe?: string
}

export interface Bedingung {
  attributeName: string

  equals?: unknown
  notEquals?: unknown

  keinesVon?: readonly unknown[]
}

export function eigenschaftSichtbar(
  bedingung: Bedingung | undefined,
  props: Record<string, unknown>,
): boolean {
  if (!bedingung) return true
  const wert = props[bedingung.attributeName]
  if (bedingung.keinesVon) {
    return !bedingung.keinesVon.some((v) => Object.is(wert, v))
  }
  if ('notEquals' in bedingung) {
    return !Object.is(wert, bedingung.notEquals)
  }
  return Object.is(wert, bedingung.equals)
}

export interface Eigenschaft {
  attributeName: string
  name: string
  description: string
  maxLength?: number
  kind: EigenschaftsArt
  options?: Wahloption[]

  unit?: string
  min?: number
  max?: number

  bearbeitung?: 'inline' | 'inspector'

  inspectorRow?: string
  visibleWhen?: Bedingung
  requiresDataSource?: boolean
  exclusiveAmongSiblings?: boolean

  quelleProp?: string

  klarnameProp?: string

  nurImEditor?: boolean
}
