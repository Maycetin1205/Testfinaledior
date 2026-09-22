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
// eintraege speichert eine Liste von Objekten; `eintrag` beschreibt, was jeder
// Eintrag traegt. Der Inspector zeichnet je Eintrag dieselben Bedienelemente.
  | 'eintraege'


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

// Die vier Abschnitte des Inspectors, in dieser Reihenfolge fuer jeden Baustein.
export type InspectorAbschnitt = 'daten' | 'inhalt' | 'aussehen'

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

  // Ohne Angabe folgt der Abschnitt aus der Art: Feld, Quelle, Relation sind
  // Daten, Texte und Listen Inhalt, alles Uebrige Aussehen.
  abschnitt?: InspectorAbschnitt
  // Eigenschaften mit derselben Gruppe stehen im Abschnitt unter einer Ueberschrift.
  gruppe?: string
  // Steht sichtbar unter dem Bedienelement, nicht als Tooltip: auf dem Tablet
  // gibt es keinen.
  zusatz?: string

  eintrag?: Eigenschaft[]
  // Name eines Eintrags auf dem Knopf „+ Spalte“ und der Wert, mit dem er anfaengt.
  eintragName?: string
  neuerEintrag?: () => Record<string, unknown>
  titelSchluessel?: string
}

// Die eine Stelle fuer eine Ja/Nein-Eigenschaft. Die REIHENFOLGE der Optionen
// ist ein Kontrakt: erste = aus, zweite = ein; der Inspector liest sie hier heraus.
export function jaNeinEigenschaft(
  schluessel: string,
  name: string,
  beschreibung: string,
  weiteres?: Partial<Eigenschaft>,
): Eigenschaft {
  return {
    schluessel,
    name,
    beschreibung,
    art: 'jaNein',
    optionen: [
      { wert: 'nein', name: 'Nein' },
      { wert: 'ja', name: 'Ja' },
    ],
    ...weiteres,
  }
}

export function abschnittVon(p: Eigenschaft): InspectorAbschnitt {
  if (p.abschnitt) return p.abschnitt
  if (p.art === 'field' || p.art === 'quelle' || p.art === 'relation') return 'daten'
  if (p.art === 'text' || p.art === 'textarea' || p.art === 'eintraege' || p.art === 'seite') return 'inhalt'
  return 'aussehen'
}
