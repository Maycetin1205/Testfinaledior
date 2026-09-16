import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Berechnung } from '../../kern/daten/berechnung'
import { ErfassungsLauf } from './erfassungsLauf'
import type { ErfassungsUmfeld } from './erfassungsZeile'
import type { ErfassungsSpalte } from './erfassungsSpalte'

type Satz = Record<string, string>

let zeilen: Satz[] | null = null

vi.mock('./nachschlagen', () => ({
  quellenZeilen: (id: string) => (id === 'q1' ? zeilen : null),
  nachschlagEintraege: () => [],
}))

vi.mock('../../softengine/data', () => ({
  feldLesen: (satz: unknown, code: string) => (satz as Satz)[code] ?? '',
}))

// A = Abgabemenge, T = Tiere, D = Tage, K = Koerpergewicht; B und S kommen aus
// dem Satz der Verabreichungsart.
const SPALTEN: ErfassungsSpalte[] = [
  { kennung: 'sV', titel: 'Verabreichung', feld: 'q1::NAME' },
  { kennung: 'sA', titel: 'Abgabemenge', feld: '' },
  { kennung: 'sT', titel: 'Tiere', feld: '' },
  { kennung: 'sD', titel: 'Tage', feld: '' },
  { kennung: 'sK', titel: 'Körpergewicht', feld: '' },
]

const BERECHNUNG: Berechnung = {
  kennung: 'b1',
  name: 'Abgabemenge',
  leit: { art: 'spalte', kennung: 'A', spalte: 'sA', einheit: 'g', ergebnis: true, runden: { stellen: 3, richtung: 'kfm' } },
  zaehler: [
    { art: 'spalte', kennung: 'T', spalte: 'sT', einheit: 'anzahl', ergebnis: true, runden: { stellen: 0, richtung: 'kfm' } },
    { art: 'spalte', kennung: 'D', spalte: 'sD', einheit: 'tag', ergebnis: true, runden: { stellen: 0, richtung: 'kfm' } },
    { art: 'spalte', kennung: 'K', spalte: 'sK', einheit: 'kg', ergebnis: true, runden: { stellen: 2, richtung: 'kfm' } },
    { art: 'datenfeld', kennung: 'B', name: 'Behandlungsmenge', feld: 'q1::175_8', einheit: 'mg' },
  ],
  nenner: [
    { art: 'datenfeld', kennung: 'S', name: 'Stammkörpergewicht', feld: 'q1::313_5', einheit: 'kg' },
  ],
}

const UMFELD: ErfassungsUmfeld = {
  spalten: SPALTEN,
  berechnungen: [BERECHNUNG],
  quelleId: 'quelleBeleg',
  paareZu: () => [],
  partnerVon: () => '',
}

const ORAL: Satz = { NAME: 'oral', '175_8': '8', '313_5': '1' }
const INJEKTION: Satz = { NAME: 'Injektion', '175_8': '4', '313_5': '1' }

let lauf: ErfassungsLauf

function wert(platz: number): string {
  lauf.rechne(UMFELD)
  return lauf.wertVon(UMFELD, platz)
}

beforeEach(() => {
  zeilen = [ORAL, INJEKTION]
  lauf = new ErfassungsLauf()
})

describe('die Berechnung in der Erfassungszeile', () => {
  it('fuellt die Abgabemenge, sobald die drei anderen stehen', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    expect(wert(1)).toBe('4,8')
    expect(lauf.istAutomatisch(UMFELD, 1)).toBe(true)
  })

  it('rechnet rueckwaerts die Tiere', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(1, '4,8')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    expect(wert(2)).toBe('10')
  })

  it('aendert das Ergebnis mit der Eingabe', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    expect(wert(1)).toBe('4,8')
    lauf.tippe(3, '6')
    expect(wert(1)).toBe('9,6')
  })

  it('macht ein ueberschriebenes Ergebnis zur Eingabe und meldet den Widerspruch', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    lauf.tippe(1, '9')
    expect(wert(1)).toBe('9')
    expect(lauf.istAutomatisch(UMFELD, 1)).toBe(false)
    expect(lauf.hinweise.join(' ')).toContain('passen nicht zusammen')
  })

  it('macht eine geleerte Zelle wieder zum Ergebnis', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    lauf.tippe(1, '9')
    lauf.tippe(1, '')
    expect(wert(1)).toBe('4,8')
    expect(lauf.hinweise).toEqual([])
  })

  it('raet nicht, wo zwei Werte fehlen', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(2, '10')
    expect(wert(1)).toBe('')
    expect(wert(3)).toBe('')
  })

  it('nimmt beim Datensatzwechsel keinen Wert des alten Satzes mit', () => {
    lauf.uebernimm(UMFELD, 0, ORAL)
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    expect(wert(1)).toBe('4,8')
    lauf.uebernimm(UMFELD, 0, INJEKTION)
    expect(wert(1)).toBe('2,4')
  })

  it('rechnet ohne zugeordneten Datensatz gar nicht', () => {
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    expect(wert(1)).toBe('')
    expect(lauf.hinweise.join(' ')).toContain('kein Datensatz')
  })

  it('haelt eine noch nicht geladene Quelle von einer leeren auseinander', () => {
    zeilen = null
    lauf.tippe(2, '10')
    lauf.tippe(3, '3')
    lauf.tippe(4, '20')
    expect(wert(1)).toBe('')
    expect(lauf.hinweise.join(' ')).toContain('noch nicht geladen')
  })

  it('schweigt in einer noch leeren Zeile', () => {
    expect(wert(1)).toBe('')
    expect(lauf.hinweise).toEqual([])
  })
})
