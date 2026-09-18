// Die Vorlage ist eine echte Lieferung: Feld 11_8 der Maske 1211S5OPT01, vom
// Nutzer am 18.09.2026 aus der Konsole kopiert (kontrakte.md 7a).
import { expect, test } from 'vitest'
import { leseMaskenFelder } from './maskenFelder'

const ECHTE_LIEFERUNG = JSON.stringify({
  '1211S5OPT01_11_8': '   10001',
  'REFRESH_1211S5OPT01_11_8': 'Herr Heinrich Brinkmann / Warendorf',
  MASKE: [
    {
      Beschreibung: 'Adressnummer', Format: 'RA', HelpNr: '36040',
      Len: '8', Name: '1211S5OPT01_11_8', Pos: '11', Status: ' ',
    },
    {
      Beschreibung: 'Straße', Format: 'L',
      Len: '46', Name: '1211S5OPT01_6331_46', Pos: '6331', Status: ' ',
    },
    {
      Beschreibung: 'Gesamtbetrag', Format: 'R2',
      Len: '12', Name: '1211S5OPT01_453_12', Pos: '453', Status: 'A',
    },
  ],
})

test('aus der Lieferung wird eine Feldliste mit Klarnamen', () => {
  const raus = leseMaskenFelder(ECHTE_LIEFERUNG)
  expect(raus?.vorsatz).toBe('1211S5OPT01_')
  expect(raus?.felder).toEqual([
    { name: 'Adressnummer', code: '11_8', zeichen: 8 },
    { name: 'Straße', code: '6331_46', zeichen: 46 },
    { name: 'Gesamtbetrag', code: '453_12', zeichen: 12 },
  ])
  // Status 'A' nimmt nichts an; der Bediener soll wissen, wie viele das sind.
  expect(raus?.nurAnzeige).toBe(1)
})

test('die blosse Feldliste reicht auch, ohne das Paket drumherum', () => {
  const nurListe = JSON.stringify([
    { Beschreibung: 'Ort', Len: '40', Name: '1211S5OPT01_6261_40', Status: ' ' },
  ])
  expect(leseMaskenFelder(nurListe)?.felder).toEqual([
    { name: 'Ort', code: '6261_40', zeichen: 40 },
  ])
})

// Ein Feld ohne lesbaren Namen still wegzulassen hiesse, eine lueckenhafte
// Liste als vollstaendig auszugeben.
test('unlesbare Eintraege werden gezaehlt, nicht verschwiegen', () => {
  const gemischt = JSON.stringify([
    { Beschreibung: 'Ort', Len: '40', Name: '1211S5OPT01_6261_40' },
    { Beschreibung: 'Ohne Name' },
    { Beschreibung: 'Krumm', Name: 'GAR_KEIN_FELDCODE' },
  ])
  const raus = leseMaskenFelder(gemischt)
  expect(raus?.felder).toHaveLength(1)
  expect(raus?.uebersprungen).toBe(2)
})

test('ohne Beschreibung bleibt der Code als Name stehen', () => {
  const ohne = JSON.stringify([{ Name: '1211S5OPT01_11_8', Len: '8' }])
  expect(leseMaskenFelder(ohne)?.felder[0]).toEqual({ name: '11_8', code: '11_8', zeichen: 8 })
})

test('was keine Maskenbeschreibung ist, wird abgelehnt', () => {
  expect(leseMaskenFelder('kein JSON')).toBeNull()
  expect(leseMaskenFelder('{"Daten":{}}')).toBeNull()
  expect(leseMaskenFelder('[]')).toBeNull()
})
