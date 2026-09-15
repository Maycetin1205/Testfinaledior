// Ist die hinausgeschickte Zeile im Beleg angekommen? Ein PUT antwortet nicht;
// beweisen kann es allein die naechste Lieferung.
import type { Lieferung } from '../../core/blocks/faehigkeiten'
import { zahlStreng } from '../../core/data/berechnung'
import type { Spalte } from '../tabelle/spalten'

export interface GesendeteZeile {
  // Leer, solange die Kette der Zeile keine Satznummer gegeben hat.
  satz: string

  werte: readonly string[]
}

// SoftEngine gibt eine getippte 7 als „7,000" zurueck; ein reiner Textvergleich
// faende die Zeile darum nie wieder.
export function wertGleich(a: string, b: string): boolean {
  const x = a.trim()
  const y = b.trim()
  if (x === y) return true
  const zx = zahlStreng(x)
  return zx !== null && zx === zahlStreng(y)
}

// Je gesendeter Zeile: steht sie in der Lieferung? Der Schluessel ist die
// Satznummer aus der Kette, sonst die gefuellten Zellen ueber die Feldcodes der
// Spalten. Jede gelieferte Zeile zaehlt nur einmal, sonst deckte eine einzige
// Position zwei gleiche Erfassungen.
export function ankunftPruefen(
  gesendet: readonly GesendeteZeile[],
  spalten: readonly Spalte[],
  lieferung: Lieferung,
): boolean[] {
  const frei = lieferung.zeilen.map(() => true)
  const angekommen = gesendet.map(() => false)

  const nimm = (platz: number, i: number): boolean => {
    if (platz === -1) return false
    frei[platz] = false
    angekommen[i] = true
    return true
  }

  // Erst die Zeilen mit Satznummer: sie ist eindeutig, ein Feldvergleich koennte
  // ihr sonst ihre Zeile wegnehmen.
  gesendet.forEach((zeile, i) => {
    if (zeile.satz === '') return
    nimm(lieferung.zeilen.findIndex(
      (z, k) => frei[k] && wertGleich(lieferung.satzVon(z), zeile.satz),
    ), i)
  })

  const felder = spalten
    .map((s, platz) => ({ platz, feld: s.feld }))
    .filter((s) => s.feld !== '')

  gesendet.forEach((zeile, i) => {
    if (zeile.satz !== '') return
    const pruefbar = felder.filter((f) => (zeile.werte[f.platz] ?? '').trim() !== '')
    // Nichts zu vergleichen: diese Zeile laesst sich weder finden noch
    // vermissen. Sie festzuhalten hiesse, sie fuer immer festzuhalten.
    if (pruefbar.length === 0) {
      angekommen[i] = true
      return
    }
    nimm(lieferung.zeilen.findIndex((z, k) => frei[k]
      && pruefbar.every((f) => wertGleich(lieferung.lies(z, f.feld), zeile.werte[f.platz] ?? ''))), i)
  })

  return angekommen
}

// Eine geaenderte Zeile stand schon vorher im Beleg; ihre Satznummer beweist
// darum nichts. Verglichen wird gegen den Wert, der VOR dem Senden dort stand:
// steht er noch da, ist nichts geschehen. Gegen den gesendeten Wert zu
// vergleichen ginge schief, sobald die ERP ihn umformt - sie rundet auf die
// Stellen des Feldes, kuerzt Text auf die Feldlaenge und schreibt Datum um.
// Eine angekommene Aenderung gaelte dann fuer immer als abgelehnt.
export function aenderungAngekommen(
  satz: string,
  geaendert: readonly { feld: string; vorher: string }[],
  lieferung: Lieferung,
): boolean {
  const zeile = lieferung.zeilen.find((z) => wertGleich(lieferung.satzVon(z), satz))
  // Die Zeile steht nicht mehr im Beleg: die Aenderung hat kein Ziel mehr, und
  // die Kette wuerde sie auch nicht noch einmal senden.
  if (zeile === undefined) return true
  // Nichts zu vergleichen: geaendert wurden nur Spalten ohne Feldcode.
  if (geaendert.length === 0) return true
  return geaendert.every((f) => !wertGleich(lieferung.lies(zeile, f.feld), f.vorher))
}

// Beim Loeschen beweist die Satznummer alles: ist sie fort, ist die Zeile fort.
export function loeschungAngekommen(satz: string, lieferung: Lieferung): boolean {
  return !lieferung.zeilen.some((z) => wertGleich(lieferung.satzVon(z), satz))
}

export interface FehlendeZeile {
  // Die Satznummer, wenn die Kette eine hatte, sonst der Platz in der Erfassung:
  // der Bediener zaehlt seine eigenen Zeilen.
  nr: string

  artikel: string
}

// Der Balken traegt eine Zeile; bei vielen Fehlenden bliebe von ihr sonst nur
// die letzte lesbar.
const HOECHSTENS = 3

function aufzaehlung(
  fehlende: readonly FehlendeZeile[],
  einzahl: string,
  mehrzahl: string,
): string {
  if (fehlende.length === 0) return ''
  const namen = fehlende.slice(0, HOECHSTENS)
    .map((f) => 'Position ' + f.nr + (f.artikel === '' ? '' : ' (' + f.artikel + ')'))
  const rest = fehlende.length - namen.length
  return namen.join(', ')
    + (rest > 0 ? ' und ' + String(rest) + ' weitere' : '')
    + ' ' + (fehlende.length === 1 ? einzahl : mehrzahl)
}

export function fehlenMeldung(fehlende: readonly FehlendeZeile[]): string {
  return aufzaehlung(
    fehlende,
    'ist nicht im Beleg angekommen.',
    'sind nicht im Beleg angekommen.',
  )
}

// Anderer Satz als beim Erfassen: die Zeile IST im Beleg, sie traegt nur die
// Aenderung nicht.
export function nichtGeaendertMeldung(fehlende: readonly FehlendeZeile[]): string {
  return aufzaehlung(
    fehlende,
    'ist im Beleg unverändert geblieben.',
    'sind im Beleg unverändert geblieben.',
  )
}

export function nichtGeloeschtMeldung(fehlende: readonly FehlendeZeile[]): string {
  return aufzaehlung(fehlende, 'steht noch im Beleg.', 'stehen noch im Beleg.')
}
