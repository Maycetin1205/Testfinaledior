import { expect, test } from 'vitest'
import type { Lieferung } from '../../core/blocks/faehigkeiten'
import {
  aenderungAngekommen,
  loeschungAngekommen,
  nichtGeaendertMeldung,
  nichtGeloeschtMeldung,
} from './ankunft'

// Eine Lieferung, wie SoftEngine sie schiebt: Zeilen mit Satznummer und Feldern.
function lieferung(zeilen: readonly Record<string, string>[]): Lieferung {
  return {
    zeilen,
    satzVon: (zeile) => (zeile as Record<string, string>).satz ?? '',
    lies: (zeile, feld) => (zeile as Record<string, string>)[feld] ?? '',
  }
}

// Bewiesen wird gegen den Wert VOR dem Senden: steht er noch da, ist nichts
// geschehen. Genau hier stand der Verlust - ein still abgelehntes PUT sieht in
// der Lieferung aus wie der alte Stand, und die Vormerkung war da schon weg.
test('die Aenderung gilt erst, wenn der Beleg den alten Wert nicht mehr zeigt', () => {
  const alt = lieferung([{ satz: '3', MENGE: '5' }])
  const neu = lieferung([{ satz: '3', MENGE: '7' }])
  expect(aenderungAngekommen('3', [{ feld: 'MENGE', vorher: '5' }], alt)).toBe(false)
  expect(aenderungAngekommen('3', [{ feld: 'MENGE', vorher: '5' }], neu)).toBe(true)
})

test('SoftEngines 5,000 ist die alte 5', () => {
  const beleg = lieferung([{ satz: '3', MENGE: '5,000' }])
  expect(aenderungAngekommen('3', [{ feld: 'MENGE', vorher: '5' }], beleg)).toBe(false)
})

// Die ERP rundet auf die Stellen des Feldes, kuerzt Text auf die Feldlaenge und
// schreibt Datum um. Gegen den GESENDETEN Wert zu vergleichen hiesse: jede
// dieser Zeilen gilt fuer immer als abgelehnt und wird endlos neu geschrieben.
test('umgeformte Werte gelten trotzdem als angekommen', () => {
  expect(aenderungAngekommen('3', [{ feld: 'MENGE', vorher: '5' }],
    lieferung([{ satz: '3', MENGE: '7,556' }]))).toBe(true)
  expect(aenderungAngekommen('3', [{ feld: 'TEXT', vorher: 'Mutter' }],
    lieferung([{ satz: '3', TEXT: 'Sechskantschraube M8x' }]))).toBe(true)
  expect(aenderungAngekommen('3', [{ feld: 'DATUM', vorher: '01.01.2026' }],
    lieferung([{ satz: '3', DATUM: '10.09.2026' }]))).toBe(true)
})

test('alle geaenderten Felder muessen sich bewegt haben, nicht nur eines', () => {
  const beleg = lieferung([{ satz: '3', MENGE: '7', PREIS: '10' }])
  expect(aenderungAngekommen('3', [
    { feld: 'MENGE', vorher: '5' },
    { feld: 'PREIS', vorher: '10' },
  ], beleg)).toBe(false)
})

// Sie festzuhalten hiesse, sie fuer immer festzuhalten: die Kette wuerde eine
// Zeile ohne Platz in der Liste auch nicht noch einmal senden.
test('eine Zeile, die nicht mehr im Beleg steht, wird losgelassen', () => {
  const beleg = lieferung([{ satz: '1', MENGE: '2' }])
  expect(aenderungAngekommen('3', [{ feld: 'MENGE', vorher: '5' }], beleg)).toBe(true)
})

test('ohne vergleichbares Feld bleibt nichts zu beweisen', () => {
  const beleg = lieferung([{ satz: '3', MENGE: '5' }])
  expect(aenderungAngekommen('3', [], beleg)).toBe(true)
})

test('geloescht ist die Zeile erst, wenn ihre Satznummer fort ist', () => {
  const davor = lieferung([{ satz: '1' }, { satz: '2' }])
  const danach = lieferung([{ satz: '1' }])
  expect(loeschungAngekommen('2', davor)).toBe(false)
  expect(loeschungAngekommen('2', danach)).toBe(true)
})

test('die Meldungen nennen Position und Artikel und zaehlen den Rest', () => {
  expect(nichtGeaendertMeldung([{ nr: '3', artikel: 'Schraube' }]))
    .toBe('Position 3 (Schraube) ist im Beleg unverändert geblieben.')
  expect(nichtGeloeschtMeldung([{ nr: '1', artikel: '' }, { nr: '2', artikel: '' }]))
    .toBe('Position 1, Position 2 stehen noch im Beleg.')
  expect(nichtGeloeschtMeldung(
    [1, 2, 3, 4, 5].map((n) => ({ nr: String(n), artikel: '' })),
  )).toBe('Position 1, Position 2, Position 3 und 2 weitere stehen noch im Beleg.')
  expect(nichtGeaendertMeldung([])).toBe('')
})
