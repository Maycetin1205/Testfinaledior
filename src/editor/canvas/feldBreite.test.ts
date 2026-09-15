import { describe, expect, it } from 'vitest'
import type { Datenquelle } from '../../kern/daten/datenquellen'
import type { QuelleInReichweite } from '../../kern/daten/weitereQuellen'
import { breiteAusZeichen, zeichenVon } from './feldBreite'

function quelle(id: string, fields: Datenquelle['fields']): QuelleInReichweite {
  return { source: { id, name: id, kind: 'artikelstamm', fields } }
}

const QUELLEN: QuelleInReichweite[] = [
  quelle('q-pos', [
    { code: '18_25', label: 'ArtNr', zeichen: 10 },
    { code: '45_60', label: 'Bezeichnung' },
  ]),
  quelle('q-art', [{ code: 'bez', label: 'Bezeichnung', zeichen: 30 }]),
]

describe('breiteAusZeichen', () => {
  it('rechnet Zeichen in einen Anteil um, der neben gezogenen Breiten steht', () => {
    expect(breiteAusZeichen(10)).toBe(90)
    expect(breiteAusZeichen(30)).toBe(230)
  })

  it('haelt das Verhaeltnis zweier Spalten naeher an der Wirklichkeit als die blosse Zeichenzahl', () => {
    // 30 zu 3 Zeichen sind nicht 10:1 - die Polsterung waechst nicht mit.
    const breit = breiteAusZeichen(30) ?? 0
    const schmal = breiteAusZeichen(3) ?? 0
    expect(breit / schmal).toBeLessThan(10)
    expect(breit / schmal).toBeGreaterThan(5)
  })

  it('gibt ohne brauchbare Angabe nichts zurueck', () => {
    expect(breiteAusZeichen(undefined)).toBeUndefined()
    expect(breiteAusZeichen(0)).toBeUndefined()
    expect(breiteAusZeichen(-5)).toBeUndefined()
    expect(breiteAusZeichen(Number.NaN)).toBeUndefined()
  })
})

describe('zeichenVon', () => {
  it('liest das Feld der Hauptquelle ohne Quellen-Teil', () => {
    expect(zeichenVon('18_25', QUELLEN)).toBe(10)
  })

  it('liest das Feld einer fremden Quelle ueber ihre Kennung', () => {
    expect(zeichenVon('q-art::bez', QUELLEN)).toBe(30)
  })

  it('schweigt, wo das Feld keine Angabe traegt', () => {
    expect(zeichenVon('45_60', QUELLEN)).toBeUndefined()
    expect(zeichenVon('gibtsnicht', QUELLEN)).toBeUndefined()
    expect(zeichenVon('18_25', [])).toBeUndefined()
  })
})
