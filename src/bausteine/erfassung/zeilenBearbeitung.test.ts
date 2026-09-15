import { beforeEach, expect, test, vi } from 'vitest'
import type { Lieferung } from '../../kern/maske/faehigkeiten'
import type { Spalte } from '../tabelle/spalten'
import { ZeilenBearbeitung } from './zeilenBearbeitung'
import { LaufStand } from './zeilenStatus'

// Die Satznummer kommt sonst ueber die Datenquelle aus der SoftEngine-Bruecke;
// hier steht sie in der Rohzeile.
vi.mock('../tabelle/seRuntime', () => ({
  zeilenIndexVon: (_el: unknown, zeile: unknown) => (zeile as { satz: string }).satz,
}))

const SPALTEN: Spalte[] = [
  { kennung: 's1', titel: 'Artikel', feld: 'ARTIKEL' },
  { kennung: 's2', titel: 'Menge', feld: 'MENGE' },
]

let datenzeilen: string[][] = []
let bearbeitung: ZeilenBearbeitung

function lieferung(zeilen: readonly Record<string, string>[]): Lieferung {
  return {
    zeilen,
    satzVon: (zeile) => (zeile as Record<string, string>).satz ?? '',
    lies: (zeile, feld) => (zeile as Record<string, string>)[feld] ?? '',
  }
}

beforeEach(() => {
  datenzeilen = [['Schraube', '5'], ['Mutter', '3']]
  bearbeitung = new ZeilenBearbeitung({
    baustein: {} as HTMLElement,
    spalten: () => SPALTEN,
    berechnungen: () => [],
    rohzeilen: () => [{ satz: '1' }, { satz: '2' }],
    datenzeilen: () => datenzeilen,
    melde: () => {},
    lauf: new LaufStand(() => {}),
    fokussiereErfassungsZelle: () => {},
  })
})

// Der Verlust, den das schliesst: bis hierher loeschte laufFertig die
// Vormerkung sofort, und die Zelle zeigte wieder den alten ERP-Wert.
test('die gesendete Aenderung bleibt sichtbar und wird nicht doppelt gesendet', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  expect(bearbeitung.geaenderteZeilen).toEqual([{ satz: '1', werte: ['Schraube', '7'] }])

  bearbeitung.austragen('geaendert', ['1'])
  expect(bearbeitung.geaenderteZeilen).toEqual([])
  expect(bearbeitung.zellWert(0, 1)).toBe('7')
  expect(bearbeitung.statusVon(0).status).toBe('geschrieben')
})

test('zeigt der Beleg den alten Wert, ist die Aenderung wieder vorgemerkt', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  bearbeitung.austragen('geaendert', ['1'])

  const bericht = bearbeitung.pruefeAnkunft(lieferung([
    { satz: '1', ARTIKEL: 'Schraube', MENGE: '5' },
    { satz: '2', ARTIKEL: 'Mutter', MENGE: '3' },
  ]))

  expect(bericht.aenderungFehlt).toEqual(['1'])
  expect(bericht.meldung).toBe('Position 1 (Schraube) ist im Beleg unverändert geblieben.')
  expect(bearbeitung.geaenderteZeilen).toEqual([{ satz: '1', werte: ['Schraube', '7'] }])
})

test('zeigt der Beleg den neuen Wert, ist die Aenderung durch', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  bearbeitung.austragen('geaendert', ['1'])

  const bericht = bearbeitung.pruefeAnkunft(lieferung([
    { satz: '1', ARTIKEL: 'Schraube', MENGE: '7' },
    { satz: '2', ARTIKEL: 'Mutter', MENGE: '3' },
  ]))
  datenzeilen = [['Schraube', '7'], ['Mutter', '3']]

  expect(bericht.aenderungFehlt).toEqual([])
  expect(bericht.meldung).toBe('')
  expect(bearbeitung.geaenderteZeilen).toEqual([])
  expect(bearbeitung.zellWert(0, 1)).toBe('7')
  expect(bearbeitung.statusVon(0).status).toBe('gebucht')
})

// Sonst naehme der Beweis dem Bediener weg, was er waehrend des Wartens tippte.
test('was waehrend des Wartens getippt wurde, ueberlebt den Rueckweg', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  bearbeitung.austragen('geaendert', ['1'])
  bearbeitung.tippeZelle(0, 1, '9')

  bearbeitung.pruefeAnkunft(lieferung([{ satz: '1', ARTIKEL: 'Schraube', MENGE: '5' }]))

  expect(bearbeitung.zellWert(0, 1)).toBe('9')
  expect(bearbeitung.geaenderteZeilen).toEqual([{ satz: '1', werte: ['Schraube', '9'] }])
})

test('steht die Zeile noch im Beleg, ist die Loeschung wieder vorgemerkt', () => {
  bearbeitung.schalteLoeschung(1)
  expect(bearbeitung.geloeschteZeilen.map((z) => z.satz)).toEqual(['2'])

  bearbeitung.austragen('geloescht', ['2'])
  expect(bearbeitung.geloeschteZeilen).toEqual([])
  // Das Kreuz bleibt gesetzt: aus der Sicht des Bedieners ist sie unterwegs.
  expect(bearbeitung.istGeloescht(1)).toBe(true)
  expect(bearbeitung.statusVon(1).status).toBe('geschrieben')

  const bericht = bearbeitung.pruefeAnkunft(lieferung([{ satz: '1' }, { satz: '2' }]))
  expect(bericht.loeschungFehlt).toEqual(['2'])
  expect(bericht.meldung).toBe('Position 2 (Mutter) steht noch im Beleg.')
  expect(bearbeitung.geloeschteZeilen.map((z) => z.satz)).toEqual(['2'])
})

test('ist die Satznummer fort, ist die Loeschung durch', () => {
  bearbeitung.schalteLoeschung(1)
  bearbeitung.austragen('geloescht', ['2'])

  const bericht = bearbeitung.pruefeAnkunft(lieferung([{ satz: '1' }]))

  expect(bericht.loeschungFehlt).toEqual([])
  expect(bearbeitung.istGeloescht(1)).toBe(false)
  expect(bearbeitung.geloeschteZeilen).toEqual([])
})

// Ein Klick oder ein Pfeil durch die wartende Zelle loest verlasseZelle aus.
// Verglichen der angezeigte Wert gegen die alten Daten, hiesse das „geaendert",
// und der Zaehler am Knopf spraenge hoch, ohne dass jemand etwas tippte.
test('durch eine wartende Zelle zu fahren merkt sie nicht neu vor', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  bearbeitung.austragen('geaendert', ['1'])

  bearbeitung.verlasseZelle(0, 1, '7')

  expect(bearbeitung.geaenderteZeilen).toEqual([])
  expect(bearbeitung.statusVon(0).status).toBe('geschrieben')
})

// Sonst spraenge die Zelle vor seinen Augen wortlos auf 7 zurueck, und die 7
// wuerde spaeter doch noch einmal geschrieben.
test('den alten Wert zuruecktippen nimmt auch das Wartende zurueck', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  bearbeitung.austragen('geaendert', ['1'])

  bearbeitung.verlasseZelle(0, 1, '5')

  expect(bearbeitung.zellWert(0, 1)).toBe('5')
  expect(bearbeitung.geaenderteZeilen).toEqual([{ satz: '1', werte: ['Schraube', '5'] }])

  // Und der Beweis darf die zurueckgenommene 7 nicht wieder hervorholen.
  bearbeitung.pruefeAnkunft(lieferung([{ satz: '1', ARTIKEL: 'Schraube', MENGE: '5' }]))
  expect(bearbeitung.zellWert(0, 1)).toBe('5')
})

// Eine Zeile, die weg soll, braucht keine Zell-Aenderung mehr - auch keine,
// die noch unterwegs ist. Sonst stuende sie am Ende in beiden Listen und der
// naechste Knopf schriebe erst einen Wert und loeschte die Zeile danach.
test('das Loeschkreuz nimmt auch die wartende Aenderung derselben Zeile weg', () => {
  bearbeitung.tippeZelle(1, 1, '8')
  bearbeitung.austragen('geaendert', ['2'])
  bearbeitung.schalteLoeschung(1)
  bearbeitung.austragen('geloescht', ['2'])

  // Der Beleg zeigt die Zeile noch, unveraendert: beides ist schiefgegangen.
  const bericht = bearbeitung.pruefeAnkunft(lieferung([
    { satz: '1', ARTIKEL: 'Schraube', MENGE: '5' },
    { satz: '2', ARTIKEL: 'Mutter', MENGE: '3' },
  ]))

  expect(bericht.loeschungFehlt).toEqual(['2'])
  expect(bericht.aenderungFehlt).toEqual([])
  expect(bericht.meldung).toBe('Position 2 (Mutter) steht noch im Beleg.')
  expect(bearbeitung.geloeschteZeilen.map((z) => z.satz)).toEqual(['2'])
  expect(bearbeitung.geaenderteZeilen).toEqual([])
})

// Sonst wartete die Zeile endlos: die Lieferung kann an einem Wert, der schon
// so dastand, nie zeigen, dass etwas geschehen ist.
test('wer schreibt, was schon dasteht, wartet auf nichts', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  datenzeilen = [['Schraube', '7'], ['Mutter', '3']]

  bearbeitung.austragen('geaendert', ['1'])

  expect(bearbeitung.statusVon(0).status).toBe('gebucht')
  const bericht = bearbeitung.pruefeAnkunft(lieferung([
    { satz: '1', ARTIKEL: 'Schraube', MENGE: '7' },
  ]))
  expect(bericht.aenderungFehlt).toEqual([])
  expect(bearbeitung.geaenderteZeilen).toEqual([])
})

test('ohne Lieferung bleibt nichts haengen', () => {
  bearbeitung.tippeZelle(0, 1, '7')
  bearbeitung.austragen('geaendert', ['1'])

  const bericht = bearbeitung.pruefeAnkunft(null)

  expect(bericht.bewegt).toBe(true)
  expect(bericht.aenderungFehlt).toEqual([])
  expect(bearbeitung.zellWert(0, 1)).toBe('5')
})
