import { expect, test } from 'vitest'
import { nachschlagKennung, nachschlagSpalten, vorschlaegeImFensterStand } from './nachschlagStand'
import { gemerkteSortierung } from './sortierung'
import { VorschlagStand } from '../shared/vorschlagStand'

const host = (id: string) => ({ getAttribute: () => id }) as unknown as HTMLElement
const spalten = nachschlagSpalten([{ kennung: '', titel: 'Nummer', feld: 'nr' }])
const eintraege = Array.from({ length: 12 }, (_, i) => ({
  anzeige: `Artikel ${i + 1}`, wert: String(i + 1), satz: { nr: String(i + 1) },
}))

test('jede Nachschlagestelle behaelt ihre Sortierung auch fuer begrenzte Tippvorschlaege', () => {
  const el = host('artikel')
  const schluessel = nachschlagKennung(el, 's1')
  gemerkteSortierung.merke(host(schluessel), { kennung: spalten[0].kennung, auf: false })
  expect(vorschlaegeImFensterStand(eintraege, 'Artikel', spalten, el, 's1').map((e) => e.wert))
    .toEqual(['12', '11', '10', '9', '8', '7', '6', '5'])
  expect(vorschlaegeImFensterStand(eintraege, 'Artikel', spalten, el, 's2')[0].wert).toBe('1')
  expect(vorschlaegeImFensterStand(eintraege, '', spalten, el, 's1')[0].wert).toBe('12')
  expect(vorschlaegeImFensterStand(eintraege, 'Artikel', [{ ...spalten[0], kennung: 'neu' }], el, 's1')[0].wert)
    .toBe('1')
})

test('automatische Spalten behalten ihre Feldkennung beim Umordnen', () => {
  const andere = { kennung: '', titel: 'Name', feld: 'name' }
  expect(nachschlagSpalten([andere, ...spalten])[1].kennung).toBe(spalten[0].kennung)
})

test('F5 oeffnet auch eine leere Quelle; F4 bleibt fuer die belegte Aktion frei', () => {
  const liste = new VorschlagStand()
  const lage = { listeOffen: false, feldLeer: true, getippt: false,
    nachschlagbar: true, hatSaetze: () => false, springt: true }
  expect(liste.folgeFuer('F5', lage)).toBe('fenster')
  expect(liste.folgeFuer('F4', lage)).toBe('nichts')
  expect(liste.folgeFuer('Enter', lage)).toBe('weiter')
})
