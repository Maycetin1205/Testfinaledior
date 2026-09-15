import { beforeEach, expect, test, vi } from 'vitest'

// Die Testumgebung hat kein Fenster; die Bruecke liest nur diese wenigen
// Stuecke. `activeElement: null` heisst „der Bediener tippt gerade nicht" —
// dann verteilt die Bruecke sofort, statt in den Nachlauf zu gehen.
const g = globalThis as unknown as Record<string, unknown>
g.HTMLElement = class {}
g.HTMLInputElement = class extends (g.HTMLElement as new () => object) {}
g.HTMLTextAreaElement = class extends (g.HTMLElement as new () => object) {}
g.HTMLSelectElement = class extends (g.HTMLElement as new () => object) {}
g.document = { activeElement: null, title: 'Pruefmaske' }

// Die Bruecke holt dem WebView die Tastatur mit einem echten Fokuswechsel ueber
// ein Hilfsfeld; dieses Miniatur-DOM schreibt mit, was fokussiert wurde.
const dok = g.document as Record<string, unknown>
const fokussiert: string[] = []
dok.createElement = (): unknown => {
  const el = new (g.HTMLInputElement as new () => object)() as Record<string, unknown>
  el.style = {}
  el.focus = () => { fokussiert.push('hilfsfeld'); dok.activeElement = el }
  el.remove = () => { dok.activeElement = null }
  return el
}
dok.body = { appendChild: () => {} }
g.window = { addEventListener: () => {} }

// Der 300-ms-Poll aus starteSe darf hier nie feuern — er verteilte sonst
// mitten in einem Test ein zweites Mal.
vi.useFakeTimers()

let schiebe: ((raw: unknown) => void) | undefined
g.basisHTML_REGISTER = (cb: (raw: unknown) => void) => { schiebe = cb }

const { starteSe: starteSe, frischeDatenAnfordern, meldeAnstoss, onSeDaten } = await import('./bridge')

const gerufen: string[] = []
let wirft = false

// Zwei echte Zuhoerer: nur so ist zu sehen, ob ein werfender die uebrigen
// abschneidet. onSeDaten kennt kein Abmelden, darum stehen sie fuer die
// ganze Datei und lesen ihren Zustand je Test.
onSeDaten(() => {
  gerufen.push('A')
  if (wirft) throw new Error('Baustein kaputt')
})
onSeDaten((lieferung) => { gerufen.push(lieferung ? 'B:lieferung' : 'B:anstoss') })

starteSe()

function schub(marke: string): void {
  schiebe?.({ Daten: { Tabellen: { T: [{ wert: marke }] } } })
}

beforeEach(() => {
  gerufen.length = 0
  wirft = false
})

test('ein werfender Zuhoerer schneidet die uebrigen nicht ab', () => {
  wirft = true
  schub('eins')
  expect(gerufen).toEqual(['A', 'B:lieferung'])
})

// Ohne diesen Riegel galt der Stand nach dem Wurf als „schon gezeigt": der
// werfende Baustein bekam denselben Schub nie wieder zu sehen.
test('nach einem Fehler beim Verteilen kommt derselbe Stand noch einmal', () => {
  wirft = true
  schub('zwei')
  wirft = false
  gerufen.length = 0
  schub('zwei')
  expect(gerufen).toEqual(['A', 'B:lieferung'])
})

// Gegenprobe: der Riegel darf den Signatur-Vergleich nicht aushebeln, sonst
// zeichnete die Maske bei jedem der unveraenderten Schuebe neu.
test('ein fehlerfrei verteilter Stand wird nicht noch einmal verteilt', () => {
  schub('drei')
  expect(gerufen).toEqual(['A', 'B:lieferung'])
  gerufen.length = 0
  schub('drei')
  expect(gerufen).toEqual([])
})

// An diesem Schalter haengt, ob eine hinausgeschickte Erfassungszeile geprueft
// und freigegeben wird (faehigkeiten/zeilenAnschluss: pruefeAnkunft).
test('ein Anstoss ist keine Lieferung', () => {
  meldeAnstoss()
  expect(gerufen).toEqual(['A', 'B:anstoss'])
})

// Nachliefern kann nur SoftEngine: das Leeren der Module allein brachte nie
// neue Daten.
test('nach dem Schreiben wird die Eingabedatei neu bestellt', () => {
  const bestellt: string[] = []
  g.ReloadInputJSON = () => { bestellt.push('ReloadInputJSON') }
  g.ResetDataBasis = () => { bestellt.push('ResetDataBasis') }
  frischeDatenAnfordern()
  expect(bestellt).toEqual(['ReloadInputJSON'])
  expect(gerufen).toEqual(['A', 'B:anstoss'])

  delete g.ReloadInputJSON
  frischeDatenAnfordern()
  expect(bestellt).toEqual(['ReloadInputJSON', 'ResetDataBasis'])
})

// Echttest 15.09., Layoutrahmen 00001: antwortet die Maske "erledigt", bleibt
// SoftEngines Auto-Fokus aus und der WebView hat keine Tastatur — der Klick
// landet in keinem Feld. Laeuft der Auto-Fokus, nimmt er dem Feld die
// Schreibmarke. Die Maske macht den Griff darum selbst (kontrakte.md 13).
test('der Fokus-Ruf holt die Tastatur und gibt dem Feld die Schreibmarke zurueck', () => {
  const fokusRuf = (): boolean => (g.basisHTML_DoSetFocusToHTML as () => boolean)()
  const feld = new (g.HTMLInputElement as new () => object)() as Record<string, unknown>
  feld.focus = () => { fokussiert.push('feld'); dok.activeElement = feld }

  dok.activeElement = feld
  fokussiert.length = 0
  expect(fokusRuf(), 'SoftEngines Auto-Fokus darf die Schreibmarke nicht abraeumen').toBe(true)
  expect(fokussiert, 'erst das Hilfsfeld, dann das Feld zurueck').toEqual(['hilfsfeld', 'hilfsfeld', 'feld'])
  expect(dok.activeElement, 'die Schreibmarke steht wieder im Feld').toBe(feld)

  dok.activeElement = null
})
