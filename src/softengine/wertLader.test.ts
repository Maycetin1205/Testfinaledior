import { beforeEach, expect, test, vi } from 'vitest'
import type { LaufzeitHolWert } from './data'

interface Sollantwort { wert: string; roh?: unknown; fehler?: string }

const antworten: Sollantwort[] = []
const gemeldet: string[] = []
const gerufen: { nr: string; params: readonly string[] }[] = []
let anstoesse = 0

const RELATIONEN = [
  { id: 'r-408', verb: 'GET_RELATION', nr: '408', parameter: [] },
  { id: 'r-put', verb: 'PUT_RELATION', nr: '174', parameter: [] },
]

vi.mock('./bridge', () => ({
  meldeAnstoss: () => { anstoesse += 1 },
  seFenster: () => ({ FF_RELATIONS: RELATIONEN }),
}))

vi.mock('./meldung', () => ({ meldeFehler: (text: string) => { gemeldet.push(text) } }))

vi.mock('./relations', async () => {
  const original = await vi.importActual<typeof import('./relations')>('./relations')
  return {
    ...original,
    relationAusfuehren: (
      template: { nr: string },
      params: readonly string[],
    ) => {
      gerufen.push({ nr: template.nr, params: [...params] })
      const naechste = antworten.shift()
      if (naechste === undefined) return Promise.resolve({ wert: '', roh: undefined })
      return Promise.resolve({ wert: naechste.wert, roh: naechste.roh, fehler: naechste.fehler })
    },
  }
})

const { holeWertQuelle, setzeWertLaderZurueck, zeileAusAntwort } = await import('./wertLader')
const { geholteZeilenFuer, setzeGeholteZeilenZurueck } = await import('./geholteZeilen')

const QUELLE = { id: 'q-adrnr', name: 'Adressnummer' }

function hol(felder: readonly string[], teil: Partial<LaufzeitHolWert> = {}): LaufzeitHolWert {
  return { relationId: 'r-408', parameter: [], felder, ...teil }
}

function abwarten(): Promise<void> {
  return new Promise((fertig) => { setTimeout(fertig, 0) })
}

beforeEach(() => {
  antworten.length = 0
  gemeldet.length = 0
  gerufen.length = 0
  anstoesse = 0
  setzeGeholteZeilenZurueck()
  setzeWertLaderZurueck()
})

test('die Antwort liegt unter dem Quellennamen — dort sucht zeilenAusLieferung sie', async () => {
  antworten.push({ wert: '12345' })
  holeWertQuelle(QUELLE, hol(['NUMMER']))
  await abwarten()

  expect(geholteZeilenFuer('Adressnummer')).toEqual([{ NUMMER: '12345' }])
  expect(anstoesse).toBe(1)
})

// Eine Relation wie 408 liefert EINEN Wert ohne Namen. Ohne diese Regel
// bliebe das einzige Feld leer, obwohl eine Antwort da war.
test('der erste Feldname bekommt die blanke Antwort', () => {
  expect(zeileAusAntwort('12345', undefined, ['NUMMER'])).toEqual({ NUMMER: '12345' })
})

test('benannte Felder gewinnen gegen die blanke Antwort', () => {
  const roh = { RESULT: { NUMMER: '999', ORT: 'Aachen' } }
  expect(zeileAusAntwort('12345', roh, ['NUMMER', 'ORT']))
    .toEqual({ NUMMER: '999', ORT: 'Aachen' })
})

test('ein zweites Feld ohne Entsprechung bleibt leer, statt die Antwort zu doppeln', () => {
  expect(zeileAusAntwort('12345', undefined, ['NUMMER', 'ORT']))
    .toEqual({ NUMMER: '12345', ORT: '' })
})

// Ein gescheiterter Ruf hat seinen Klartext schon im Balken. Den alten Stand
// gegen Leere zu tauschen hiesse, aus einem Fehler ein leeres Feld zu machen.
test('nach einem Fehler bleibt der alte Stand stehen', async () => {
  antworten.push({ wert: '12345' })
  holeWertQuelle(QUELLE, hol(['NUMMER']))
  await abwarten()

  antworten.push({ wert: '', fehler: 'SoftEngine hat nicht geantwortet' })
  holeWertQuelle(QUELLE, hol(['NUMMER']))
  await abwarten()

  expect(geholteZeilenFuer('Adressnummer')).toEqual([{ NUMMER: '12345' }])
})

test('eine fehlende Relation meldet sich, statt still leer zu bleiben', () => {
  holeWertQuelle(QUELLE, hol(['NUMMER'], { relationId: 'r-gibtsnicht' }))
  expect(gemeldet).toHaveLength(1)
  expect(gerufen).toEqual([])
})

// PUT meldet nichts zurueck (SE-Kontrakt). Eine Quelle darauf zu setzen
// hiesse, auf eine Antwort zu warten, die es nie gibt.
test('eine schreibende Relation holt keinen Wert', () => {
  holeWertQuelle(QUELLE, hol(['NUMMER'], { relationId: 'r-put' }))
  expect(gemeldet).toHaveLength(1)
  expect(gerufen).toEqual([])
})

test('feste Parameter gehen so hinaus, wie sie dastehen', async () => {
  antworten.push({ wert: 'ok' })
  holeWertQuelle(QUELLE, hol(['NUMMER'], {
    parameter: [{ quelle: 'fixed', wert: 'AB' }, { quelle: 'fixed', wert: '' }],
  }))
  await abwarten()

  expect(gerufen).toEqual([{ nr: '408', params: ['AB', ''] }])
})