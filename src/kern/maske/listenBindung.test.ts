// Der Vertrag um den Spaltentitel: wer ihn getippt hat, behaelt ihn.
import { expect, test } from 'vitest'
import {
  getippterTitel,
  listeFuerExport,
  titelNachFeldwahl,
  type ListenBindung,
} from './listenBindung'

const SPALTEN: ListenBindung = {
  prop: 'spalten',
  titelSchluessel: 'titel',
  feldSchluessel: 'feld',
  standardTitel: 'Spalte {n}',
}

// So schreibt der Feld-Waehler in einen Eintrag: `undefined` loescht den
// Schluessel, sonst reiste eine leere Marke in jede Maskendatei mit.
function schreibe(
  eintrag: Record<string, unknown>,
  teil: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...eintrag }
  for (const [key, wert] of Object.entries(teil)) {
    if (wert === undefined) delete next[key]
    else next[key] = wert
  }
  return next
}

test('ein getippter Titel bleibt bei der naechsten Feldwahl stehen', () => {
  const spalte = schreibe({ titel: 'Spalte 1', feld: '' }, getippterTitel(SPALTEN, 'Menge'))

  expect(spalte.titel).toBe('Menge')
  expect(titelNachFeldwahl(spalte, 'Artikelnummer')).toBeUndefined()
})

test('ein nie getippter und ein leerer Titel bekommen den Klarnamen des Feldes', () => {
  expect(titelNachFeldwahl({ titel: 'Spalte 1', feld: '' }, 'Artikelnummer')).toBe('Artikelnummer')

  const geleert = schreibe(
    schreibe({ titel: 'Spalte 1', feld: '' }, getippterTitel(SPALTEN, 'Menge')),
    getippterTitel(SPALTEN, ''),
  )
  expect(geleert).toEqual({ titel: '', feld: '' })
  expect(titelNachFeldwahl(geleert, 'Artikelnummer')).toBe('Artikelnummer')
})

test('die Marke am Titel reist nicht in die Maske mit', () => {
  const spalte = schreibe(
    { kennung: 's1', titel: 'Spalte 1', feld: '3_8' },
    getippterTitel(SPALTEN, 'Menge'),
  )

  expect(listeFuerExport([spalte], SPALTEN)).toEqual([
    { kennung: 's1', titel: 'Menge', feld: '3_8' },
  ])
})
