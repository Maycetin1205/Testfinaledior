import { describe, expect, it } from 'vitest'
import {
  berechnungenAus,
  berechnungsMaengel,
  ergaenzeZeile,
  einheitenProbe,
  rechneBerechnung,
  richtungAlsText,
  type Berechnung,
  type Faktor,
  type FaktorStand,
} from './berechnung'

// Der Fall, um den es geht: Abgabemenge = Tiere × Tage × Körpergewicht ×
// Behandlungsmenge ÷ Stammkörpergewicht.
function gruppe(teil: Partial<Berechnung> = {}): Berechnung {
  return {
    kennung: 'b1',
    name: 'Abgabemenge',
    leit: {
      art: 'spalte',
      kennung: 'A',
      spalte: 'sA',
      einheit: 'g',
      ergebnis: true,
      runden: { stellen: 3, richtung: 'kfm' },
    },
    zaehler: [
      { art: 'spalte', kennung: 'T', spalte: 'sT', einheit: 'anzahl', ergebnis: true, runden: { stellen: 0, richtung: 'kfm' } },
      { art: 'spalte', kennung: 'D', spalte: 'sD', einheit: 'tag', ergebnis: true, runden: { stellen: 0, richtung: 'kfm' } },
      { art: 'spalte', kennung: 'K', spalte: 'sK', einheit: 'kg', ergebnis: true, runden: { stellen: 2, richtung: 'kfm' } },
      { art: 'datenfeld', kennung: 'B', name: 'Behandlungsmenge', feld: 'q1::175_8', einheit: 'mg' },
    ],
    nenner: [
      { art: 'datenfeld', kennung: 'S', name: 'Stammkörpergewicht', feld: 'q1::313_5', einheit: 'kg' },
    ],
    ...teil,
  }
}

const TITEL: Record<string, string> = {
  sA: 'Abgabemenge', sT: 'Tiere', sD: 'Tage', sK: 'Körpergewicht',
}

function rechne(
  b: Berechnung,
  werte: Record<string, number | FaktorStand>,
  maengel: readonly string[] = [],
) {
  const stand = (f: Faktor): FaktorStand => {
    const wert = werte[f.kennung]
    if (wert === undefined) return { art: 'leer' }
    return typeof wert === 'number' ? { art: 'zahl', zahl: wert } : wert
  }
  return rechneBerechnung(b, stand, (k) => TITEL[k] ?? '', maengel)
}

// 10 Tiere, 3 Tage, 20 kg, 8 mg je kg Stammgewicht, Stamm 1 kg:
// 10 × 3 × 20000 g × 0,008 g ÷ 1000 g = 4,8 g.
const VOLL = { T: 10, D: 3, K: 20, B: 8, S: 1 }

describe('die vier Rechenrichtungen', () => {
  it('rechnet die Abgabemenge vorwaerts', () => {
    const lage = rechne(gruppe(), VOLL)
    expect(lage).toMatchObject({ art: 'ergebnis', kennung: 'A', spalte: 'sA', zahl: 4.8 })
  })

  it('rechnet die Tiere rueckwaerts', () => {
    const lage = rechne(gruppe(), { A: 4.8, D: 3, K: 20, B: 8, S: 1 })
    expect(lage).toMatchObject({ art: 'ergebnis', kennung: 'T', zahl: 10 })
  })

  it('rechnet die Tage rueckwaerts', () => {
    expect(rechne(gruppe(), { A: 4.8, T: 10, K: 20, B: 8, S: 1 }))
      .toMatchObject({ art: 'ergebnis', kennung: 'D', zahl: 3 })
  })

  it('rechnet das Koerpergewicht rueckwaerts', () => {
    expect(rechne(gruppe(), { A: 4.8, T: 10, D: 3, B: 8, S: 1 }))
      .toMatchObject({ art: 'ergebnis', kennung: 'K', zahl: 20 })
  })
})

describe('Einheiten', () => {
  it('liefert dasselbe Ergebnis in Milligramm', () => {
    const b = gruppe()
    const mg = { ...b, leit: { ...b.leit, einheit: 'mg', runden: { stellen: 0, richtung: 'kfm' as const } } }
    expect(rechne(mg, VOLL)).toMatchObject({ art: 'ergebnis', zahl: 4800 })
  })

  it('rechnet Masse nicht in Volumen um', () => {
    const b = gruppe()
    const gemischt = {
      ...b,
      zaehler: b.zaehler.map((f) => (f.kennung === 'B' ? { ...f, einheit: 'ml' } : f)),
    }
    expect(einheitenProbe(gemischt)).not.toBe('')
    expect(rechne(gemischt, VOLL).art).toBe('unvollstaendig')
  })

  it('laesst Volumen gegen Volumen zu', () => {
    const b = gruppe()
    const fluessig = {
      ...b,
      leit: { ...b.leit, einheit: 'ml' },
      zaehler: b.zaehler.map((f) => (f.kennung === 'B' ? { ...f, einheit: 'ml' } : f)),
    }
    expect(einheitenProbe(fluessig)).toBe('')
    // Milliliter ist die Basis des Volumens: 600 kg-Tage mal 8 ml je kg sind 4800 ml.
    expect(rechne(fluessig, VOLL)).toMatchObject({ art: 'ergebnis', zahl: 4800 })
  })

  it('haelt an, wo eine Einheit unbekannt ist', () => {
    const b = gruppe()
    const fremd = { ...b, leit: { ...b.leit, einheit: 'stk' } }
    expect(rechne(fremd, VOLL).art).toBe('unvollstaendig')
  })
})

describe('was kein Ergebnis geben darf', () => {
  it('raet nicht, wo zwei Werte fehlen', () => {
    expect(rechne(gruppe(), { T: 10, D: 3, B: 8, S: 1 }).art).toBe('offen')
  })

  it('teilt nicht durch null', () => {
    const lage = rechne(gruppe(), { ...VOLL, S: 0 })
    expect(lage.art).toBe('unvollstaendig')
  })

  it('rechnet nicht mit einem nicht zugeordneten Datensatz', () => {
    const lage = rechne(gruppe(), { T: 10, D: 3, K: 20, B: { art: 'ohneSatz' }, S: 1 })
    expect(lage).toMatchObject({ art: 'unvollstaendig' })
    expect(lage.art === 'unvollstaendig' && lage.text).toContain('kein Datensatz')
  })

  it('haelt „noch nicht geladen" von „leer" auseinander', () => {
    const lage = rechne(gruppe(), { T: 10, D: 3, K: 20, B: { art: 'nichtGeladen' }, S: 1 })
    expect(lage.art === 'unvollstaendig' && lage.text).toContain('noch nicht geladen')
  })

  it('rechnet nicht mit einem unlesbaren Wert', () => {
    const lage = rechne(gruppe(), { T: { art: 'ungueltig', text: 'zehn' }, D: 3, K: 20, B: 8, S: 1 })
    expect(lage.art === 'unvollstaendig' && lage.text).toContain('keine Zahl')
  })

  it('nimmt die Null als Wert, nicht als Luecke', () => {
    // T = 0 ist gefuellt: die Abgabemenge ist dann null, nicht offen.
    expect(rechne(gruppe(), { ...VOLL, T: 0 }))
      .toMatchObject({ art: 'ergebnis', kennung: 'A', zahl: 0 })
  })
})

describe('alle vier von Hand', () => {
  it('ersetzt nichts, solange die Werte zusammenpassen', () => {
    expect(rechne(gruppe(), { ...VOLL, A: 4.8 }).art).toBe('stimmt')
  })

  it('zeigt einen Widerspruch in Worten', () => {
    const lage = rechne(gruppe(), { ...VOLL, A: 9 })
    expect(lage.art).toBe('widerspruch')
    expect(lage.art === 'widerspruch' && lage.text).toContain('Abgabemenge')
  })
})

describe('Aufbau', () => {
  it('nennt die Richtung jeder Groesse in Worten', () => {
    const b = gruppe()
    expect(richtungAlsText(b, 'A', (k) => TITEL[k] ?? '?'))
      .toBe('Abgabemenge = Tiere × Tage × Körpergewicht × Behandlungsmenge ÷ Stammkörpergewicht')
    expect(richtungAlsText(b, 'T', (k) => TITEL[k] ?? '?'))
      .toBe('Tiere = Abgabemenge × Stammkörpergewicht ÷ Tage ÷ Körpergewicht ÷ Behandlungsmenge')
  })

  it('meldet eine gestrichene Spalte als Mangel, statt sie wegzulassen', () => {
    const maengel = berechnungsMaengel(
      gruppe(),
      (k) => (k === 'sK' ? null : TITEL[k] ?? k),
      (feld) => feld,
    )
    expect(maengel.some((m) => m.includes('sK'))).toBe(true)
    // Und sie rechnet dann gar nicht, statt mit einer anderen Formel.
    expect(rechne(gruppe(), VOLL, maengel).art).toBe('unvollstaendig')
  })

  it('meldet ein gestrichenes Datenfeld als Mangel', () => {
    const maengel = berechnungsMaengel(
      gruppe(),
      (k) => TITEL[k] ?? k,
      (feld) => (feld === 'q1::313_5' ? null : feld),
    )
    expect(maengel.some((m) => m.includes('Stammkörpergewicht'))).toBe(true)
  })

  it('liest eine gespeicherte Berechnung unveraendert zurueck', () => {
    const zurueck = berechnungenAus(JSON.parse(JSON.stringify([gruppe()])))
    expect(zurueck).toHaveLength(1)
    expect(rechne(zurueck[0], VOLL)).toMatchObject({ art: 'ergebnis', zahl: 4.8 })
  })
})

describe('eine ganze Zeile', () => {
  const doppelt: Berechnung = {
    kennung: 'b1',
    name: 'Doppelt',
    leit: { art: 'spalte', kennung: 'f0', spalte: 'k3', einheit: 'anzahl', ergebnis: true, runden: { stellen: 2, richtung: 'kfm' } },
    zaehler: [
      { art: 'spalte', kennung: 'f1', spalte: 'k1', einheit: 'anzahl', ergebnis: false, runden: { stellen: 3, richtung: 'kfm' } },
      { art: 'spalte', kennung: 'f2', spalte: 'k2', einheit: 'anzahl', ergebnis: false, runden: { stellen: 3, richtung: 'kfm' } },
    ],
    nenner: [],
  }
  const mitSteuer: Berechnung = {
    kennung: 'b2',
    name: 'Mit Steuer',
    leit: { art: 'spalte', kennung: 'f0', spalte: 'k4', einheit: 'anzahl', ergebnis: true, runden: { stellen: 2, richtung: 'kfm' } },
    zaehler: [
      { art: 'spalte', kennung: 'f1', spalte: 'k3', einheit: 'anzahl', ergebnis: false, runden: { stellen: 3, richtung: 'kfm' } },
      { art: 'zahl', kennung: 'f2', name: '1,19', zahl: 1.19, einheit: 'anzahl' },
    ],
    nenner: [],
  }
  const platzVon = (k: string): number => ['k1', 'k2', 'k3', 'k4'].indexOf(k)
  const zahl = (t: string): number | null => (/^-?\d+(,\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null)
  const texte = (werte: ReadonlyMap<number, { text: string }>): Record<number, string> =>
    Object.fromEntries([...werte].map(([p, w]) => [p, w.text]))

  it('fuellt die Ergebnisspalten einer gelieferten Zeile, auch eine aus der anderen', () => {
    const werte = ergaenzeZeile([doppelt, mitSteuer], platzVon, (p) => ['5', '2', '', ''][p], zahl)
    expect(texte(werte)).toEqual({ 2: '10', 3: '11,9' })
  })

  it('laesst die Zelle leer, wo eine Groesse keine Zahl ist', () => {
    const werte = ergaenzeZeile([doppelt], platzVon, (p) => ['—', '2', ''][p], zahl)
    expect(werte.size).toBe(0)
  })

  it('haelt zwei Berechnungen an, die einander brauchen', () => {
    const a: Berechnung = { ...doppelt, zaehler: [{ art: 'spalte', kennung: 'f1', spalte: 'k4', einheit: 'anzahl', ergebnis: false, runden: { stellen: 3, richtung: 'kfm' } }] }
    const werte = ergaenzeZeile([a, mitSteuer], platzVon, () => '', zahl)
    expect(werte.size).toBe(0)
  })
})
