import { expect, test } from 'vitest'
import { QUELLEN_ARTEN } from '../../kern/daten/datenquellen'
import { passt } from './vorlagenSuche'

// Hier haengt, ob die Vorlagenwahl mehr kann als eine Liste: der Bediener sucht
// nach dem, was die Daten SIND, nicht nach dem Namen, den der Editor der Art
// gegeben hat.

function treffer(suche: string): string[] {
  return QUELLEN_ARTEN.filter((a) => passt(a.id, suche)).map((a) => a.id)
}

test('ohne Suchwort stehen alle Vorlagen da', () => {
  expect(treffer('')).toHaveLength(QUELLEN_ARTEN.length)
  expect(treffer('   ')).toHaveLength(QUELLEN_ARTEN.length)
})

test('wer „Kunde" sucht, findet den Adressstamm', () => {
  expect(treffer('Kunde')).toContain('adressstamm')
})

test('wer „Zeile" oder „Position" sucht, findet die Belegpositionen', () => {
  expect(treffer('Zeile')).toContain('belegposition')
  expect(treffer('position')).toContain('belegposition')
})

// Die Tabellenkennung ist das, was in SoftEngine steht; wer sie im Kopf hat,
// soll nicht den deutschen Namen raten muessen.
test('die Tabellenkennung findet ihre Vorlage', () => {
  expect(treffer('POS')).toContain('belegposition')
  expect(treffer('ADR')).toContain('adressstamm')
  expect(treffer('ART')).toContain('artikelstamm')
})

test('Gross- und Kleinschreibung ist egal', () => {
  expect(treffer('beleg')).toEqual(treffer('BELEG'))
})

// Ein Wort, das nirgends steht, darf nicht doch etwas zeigen: sonst waere die
// Suche ein Filter, der nie filtert.
test('ein unbekanntes Wort findet nichts', () => {
  expect(treffer('Schraubenzieher')).toEqual([])
})
