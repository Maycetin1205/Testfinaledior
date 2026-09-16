import { expect, test } from 'vitest'
import { ERFASSUNG_SPALTEN_BINDUNG } from './erfassungsSpalte'

// Anfuegen, Streichen und Verschieben bauen die ganze Spaltenliste neu auf. Was
// nur die Erfassung an ihrer Spalte fuehrt, verschwand dabei still: das
// Nachschlagen der Zelle, der Schalter und das Suchfenster.
const spalten = [
  {
    kennung: 's1',
    titel: 'Bezeichnung',
    feld: '45_60',
    fuellFeld: 'q-art::bez',
    aenderbar: false,
    fensterSpalten: [{ kennung: 'f1', titel: 'Nummer', feld: 'nr' }],
    fensterBreite: 600,
  },
  { kennung: 's2', titel: 'Menge', feld: '45_61', fuellFeld: 'q-art::menge' },
]

const bindung = ERFASSUNG_SPALTEN_BINDUNG

const fuellFelder = (liste: unknown): unknown[] =>
  (liste as Record<string, unknown>[]).map((s) => s.fuellFeld)

test('Anfuegen, Streichen und Verschieben behalten das Nachschlagen der Spalte', () => {
  expect(fuellFelder(bindung.eintragNeu?.({ spalten }).spalten))
    .toEqual(['q-art::bez', 'q-art::menge', undefined])
  expect(fuellFelder(bindung.eintragWeg?.({ spalten }, 1).spalten))
    .toEqual(['q-art::bez'])
  expect(fuellFelder(bindung.eintragVerschieben?.({ spalten }, 0, 1).spalten))
    .toEqual(['q-art::menge', 'q-art::bez'])
})

test('mit dem Nachschlagen bleiben Schalter und Suchfenster der Spalte', () => {
  const liste = bindung.eintragNeu?.({ spalten }).spalten as Record<string, unknown>[]
  expect(liste[0].aenderbar).toBe(false)
  expect(liste[0].fensterBreite).toBe(600)
  expect((liste[0].fensterSpalten as unknown[]).length).toBe(1)
})
