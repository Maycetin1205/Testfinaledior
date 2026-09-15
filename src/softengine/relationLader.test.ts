import { beforeEach, expect, test, vi } from 'vitest'
import type { LaufzeitLadeRelation } from './data'

interface Sollantwort { wert: string; fehler?: string }

const antworten: Sollantwort[] = []
const gemeldet: string[] = []
let anstoesse = 0

vi.mock('./relations', () => ({
  relationAusfuehren: () => {
    const naechste = antworten.shift()
    if (naechste === undefined) return Promise.resolve({ wert: '', roh: undefined })
    return Promise.resolve({ wert: naechste.wert, roh: undefined, fehler: naechste.fehler })
  },
}))

// Der Hol-Lauf haengt am Zeilenklick, nicht an einem SoftEngine-Schub: er
// darf nur ANSTOSSEN. Meldete er eine Lieferung, haelte die Erfassung ihre
// hinausgeschickten Zeilen daran fuer nicht angekommen (s. pruefeAnkunft).
vi.mock('./bridge', () => ({ meldeAnstoss: () => { anstoesse += 1 } }))

vi.mock('./meldung', () => ({ meldeFehler: (text: string) => { gemeldet.push(text) } }))

const { ladeZeilenPerRelation } = await import('./relationLader')
const { geholteZeilenFuer, setzeGeholteZeilenZurueck } = await import('./geholteZeilen')

const QUELLE = { id: 'q-pos', name: 'POS' }

// Ein Satz, den die Ende-Pruefung NICHT fuer das Listenende haelt: ab Stelle
// 11 steht etwas.
const SATZ = 'x'.repeat(11) + 'ABC'

function lade(zusatzFelder: readonly string[] = []): LaufzeitLadeRelation {
  return {
    nr: '69',
    belegartFeld: '2_1',
    belegnummerFeld: '3_8',
    jahrFeld: '',
    archivFeld: '',
    endeFelder: ['11_6'],
    zusatzFelder,
  }
}

const GEBER = { '2_1': 'A', '3_8': '4711' }

function abwarten(): Promise<void> {
  return new Promise((fertig) => { setTimeout(fertig, 0) })
}

beforeEach(() => {
  antworten.length = 0
  gemeldet.length = 0
  anstoesse = 0
  setzeGeholteZeilenZurueck()
})

test('ein vollstaendiger Lauf veroeffentlicht die Zeilen', async () => {
  antworten.push({ wert: SATZ }, { wert: '' })
  ladeZeilenPerRelation(QUELLE, lade(), GEBER)
  await abwarten()

  expect(geholteZeilenFuer('POS')).toEqual([{ SATZ }])
  expect(gemeldet).toEqual([])
  expect(anstoesse).toBe(1)
})

// Leer bleibt die Tabelle so oder so; nur sagt sie jetzt, woran es liegt.
test('eine Zeile ohne Belegnummer laedt nichts und sagt es', async () => {
  ladeZeilenPerRelation(QUELLE, lade(), { '2_1': 'A' })
  await abwarten()

  expect(geholteZeilenFuer('POS')).toEqual([])
  expect(gemeldet.join(' ')).toContain('Belegnummer (3_8)')
  expect(gemeldet.join(' ')).not.toContain('Belegart')
})

// Ein gescheiterter Ruf liefert einen LEEREN Satz. Der sieht aus wie das Ende
// der Liste: ohne diese Pruefung schnitte ein Timeout die restlichen Positionen
// stumm ab und die halbe Liste ginge als ganze durch.
test('ein Fehler bricht ab, meldet und veroeffentlicht KEINE halbe Liste', async () => {
  antworten.push(
    { wert: SATZ },
    { wert: '', fehler: 'Daten laden: SoftEngine hat nicht geantwortet (Relation Nr. 69).' },
  )
  ladeZeilenPerRelation(QUELLE, lade(), GEBER)
  await abwarten()

  expect(geholteZeilenFuer('POS')).toEqual([])
  expect(anstoesse).toBe(0)
  expect(gemeldet).toHaveLength(1)
  expect(gemeldet[0]).toContain('SoftEngine hat nicht geantwortet')
  expect(gemeldet[0]).toContain('Zeile 2')
})

// Die Hol-Rufe laufen 'still' — der Balken bliebe sonst bei jeder Position
// stehen. Der Abbruch selbst muss trotzdem sichtbar sein.
test('auch ein Fehler im Zusatzfeld bricht ab und meldet', async () => {
  antworten.push(
    { wert: SATZ },
    { wert: '', fehler: 'Daten laden nicht möglich: keine Verbindung zu SoftEngine.' },
  )
  ladeZeilenPerRelation(QUELLE, lade(['645_10']), GEBER)
  await abwarten()

  expect(geholteZeilenFuer('POS')).toEqual([])
  expect(anstoesse).toBe(0)
  expect(gemeldet).toHaveLength(1)
  expect(gemeldet[0]).toContain('keine Verbindung zu SoftEngine')
})
