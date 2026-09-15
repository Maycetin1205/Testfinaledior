// Relations-Rufe an SoftEngine: einer zur Zeit, mit Warteschlange und Verfallsmarke.
import {
  RELATIONS_VERBEN,
  type RelationsVorlage,
  type RelationsVerb,
} from '../kern/daten/relationen'
import { BAUSTEIN_ID_ATTR, type Parameter } from '../kern/daten/aktionen'
import { starteSe, onSeAntwort, seFenster } from './bridge'
import {
  quelleAusListe,
  feldLesen,
  istObjekt,
  zeilenAusLieferung,
} from './data'
import { meldeFehler } from './meldung'

export interface RelationAntwort {
  wert: string

  roh: unknown

  // Gesetzt, wenn der Ruf nicht hinausging oder unbeantwortet blieb. Leer heisst
  // NICHT „die ERP hat uebernommen": ein PUT ist ein Einweg-Ruf.
  fehler?: string
}

function fehlertext(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export type LaufzeitRelation = Pick<RelationsVorlage, 'id' | 'verb' | 'nr' | 'parameter'>

export function laufzeitRelation(id: string): LaufzeitRelation | undefined {
  return relationAusListe(seFenster().FF_RELATIONS, id)
}

export function relationAusListe(list: unknown, id: string): LaufzeitRelation | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!istObjekt(entry) || entry.id !== id) continue
    if (typeof entry.verb !== 'string' || !RELATIONS_VERBEN.includes(entry.verb as RelationsVerb)) continue
    if (typeof entry.nr !== 'string' || entry.nr === '') continue
    if (!Array.isArray(entry.parameter) || entry.parameter.some((p) => typeof p !== 'string')) continue
    return { id, verb: entry.verb as RelationsVerb, nr: entry.nr, parameter: entry.parameter as string[] }
  }
  return undefined
}

const SATZ_SCHLUESSEL = ['RESULT', 'result'] as const

const RESULT_KEYS = [
  'RESULT', 'result', 'PINDEX', 'pindex', 'INDEX', 'index',
  '0_10', 'KEY', 'key', 'ID', 'id', 'VALUE', 'value',
] as const

function parsed(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) as unknown } catch { return undefined }
}

function scalar(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim()
    return t === '' ? undefined : t
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function firstScalar(value: unknown, depth: number): string | undefined {
  if (depth > 12) return undefined
  const direct = scalar(value)
  if (direct !== undefined) return direct
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstScalar(entry, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!istObjekt(value)) return undefined
  for (const key of RESULT_KEYS) {
    if (!(key in value)) continue
    const found = firstScalar(value[key], depth + 1)
    if (found !== undefined) return found
  }
  for (const entry of Object.values(value)) {
    const found = firstScalar(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export function ergebnisAusAntwort(raw: unknown): string | undefined {
  const value = parsed(raw)
  if (!istObjekt(value)) return undefined
  for (const key of RESULT_KEYS) {
    if (!(key in value)) continue
    const found = firstScalar(value[key], 0)
    if (found !== undefined) return found
  }
  // Traegt die Nachricht den RESULT-Schluessel, IST sie die Antwort, auch leer.
  // Bliebe der Job offen, liefe er in den Timeout und stellte die Verfallsmarke
  // scharf, die dann die erste echte Antwort des naechsten Rufs verwuerfe.
  for (const key of SATZ_SCHLUESSEL) {
    if (typeof value[key] === 'string') return ''
  }
  for (const entry of Object.values(value)) {
    if (Array.isArray(entry)) {
      for (const item of entry) {
        const found = ergebnisAusAntwort(item)
        if (found !== undefined) return found
      }
    } else if (istObjekt(entry)) {
      const found = ergebnisAusAntwort(entry)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function extractSatzAntwort(raw: unknown, tiefe = 0): string | undefined {
  if (tiefe > 12) return undefined
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractSatzAntwort(entry, tiefe + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!istObjekt(value)) return undefined
  for (const key of SATZ_SCHLUESSEL) {
    const wert = value[key]
    if (typeof wert === 'string') return wert
    if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert)
  }
  for (const entry of Object.values(value)) {
    const found = extractSatzAntwort(entry, tiefe + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export function feldAusAntwort(raw: unknown, code: string, tiefe = 0): string {
  if (code.trim() === '' || tiefe > 12) return ''
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = feldAusAntwort(entry, code, tiefe + 1)
      if (found !== '') return found
    }
    return ''
  }
  if (!istObjekt(value)) return ''
  const direkt = feldLesen(value, code)
  if (direkt !== '') return direkt
  for (const entry of Object.values(value)) {
    const found = feldAusAntwort(entry, code, tiefe + 1)
    if (found !== '') return found
  }
  return ''
}

function seMessageKeys(seData: unknown): string[] {
  if (!istObjekt(seData)) return []
  return Object.keys(seData).filter((key) => /^Message\d+$/.test(key))
}

export interface NeueNachricht extends RelationAntwort {
  schluessel: string
}

function newSeMessageResult(
  seData: unknown,
  before: ReadonlySet<string>,
  satzAntwort = false,
): NeueNachricht | undefined {
  if (!istObjekt(seData)) return undefined
  const keys = seMessageKeys(seData)
    .filter((key) => !before.has(key))
    .sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)))
  for (const key of keys) {
    const found = satzAntwort ? extractSatzAntwort(seData[key]) : ergebnisAusAntwort(seData[key])
    if (found !== undefined) return { wert: found, roh: seData[key], schluessel: key }
  }
  return undefined
}

export interface RelationOptionen {
  still?: boolean
  satzAntwort?: boolean
}

interface GetJob {
  template: LaufzeitRelation
  params: string[]
  resolve: (antwort: RelationAntwort) => void
  optionen: RelationOptionen
}

const getQueue: GetJob[] = []
let getBusy = false
const GET_TIMEOUT_MS = 20_000
const GET_POLL_MS = 100

// Eine Antwort sagt nicht, auf welche Frage sie gehoert; es ist immer nur EIN Ruf
// unterwegs. Laeuft er in den Timeout, ist seine Antwort noch unterwegs und loeste
// sonst den naechsten Frager mit fremden Daten auf — darum verfaellt danach die
// naechste eintreffende Antwort. Zwei Grenzen halten die Marke davon ab, selbst
// zum Fehler zu werden.
const VERFALL_MS = GET_TIMEOUT_MS
let verfallenBis = 0
let verfaelltRueckruf = false
let verfaelltNachlese = false

function markeGilt(): boolean {
  return Date.now() < verfallenBis
}

export function setzeVerfallZurueck(): void {
  verfaelltRueckruf = false
  verfaelltNachlese = false
  verfallenBis = 0
}

function runNextGet(): void {
  if (getBusy || getQueue.length === 0) return
  getBusy = true
  const job = getQueue.shift()!
  let settled = false
  let verfallenGenutzt = false
  let unsubscribe: (() => void) | null = null
  let poll: ReturnType<typeof setInterval> | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null

  // `finish` gibt die Warteschlange in JEDEM Fall frei; bliebe sie stehen, laedt
  // die Maske fuer den Rest der Sitzung keine Daten mehr.
  const finish = (wert: string, roh: unknown, fehler?: string): void => {
    if (settled) return
    settled = true
    unsubscribe?.()
    if (poll !== null) clearInterval(poll)
    if (timeout !== null) clearTimeout(timeout)
    getBusy = false
    job.resolve(fehler === undefined ? { wert, roh } : { wert, roh, fehler })

    queueMicrotask(runNextGet)
  }

  // Der Balken schweigt bei 'still', der Bericht an die Kette nie: sonst braeche
  // ein Lauf ab, ohne dass jemand sagen kann, woran.
  const gescheitert = (text: string): void => {
    if (!job.optionen.still) meldeFehler(text)
    finish('', undefined, text)
  }

  try {
    const g = seFenster()
    const before = new Set(seMessageKeys(g.SEDATA))
    const satzAntwort = job.optionen.satzAntwort === true

    unsubscribe = onSeAntwort((raw) => {
      const result = satzAntwort ? extractSatzAntwort(raw) : ergebnisAusAntwort(raw)
      if (result === undefined) return
      if (verfaelltRueckruf && markeGilt()) {
        verfaelltRueckruf = false
        verfallenGenutzt = true
        return
      }
      finish(result, raw)
    })

    poll = setInterval(() => {
      const nachricht = newSeMessageResult(seFenster().SEDATA, before, satzAntwort)
      if (nachricht === undefined) return
      if (verfaelltNachlese && markeGilt()) {
        verfaelltNachlese = false
        verfallenGenutzt = true
      // Sonst faende der naechste Durchlauf dieselbe Nachricht erneut.
        before.add(nachricht.schluessel)
        return
      }
      finish(nachricht.wert, nachricht.roh)
    }, GET_POLL_MS)

    timeout = setTimeout(() => {
      if (!verfallenGenutzt) {
        verfaelltRueckruf = true
        verfaelltNachlese = true
        verfallenBis = Date.now() + VERFALL_MS
      }
      gescheitert(`Daten laden: SoftEngine hat nicht geantwortet (Relation Nr. ${job.template.nr}).`)
    }, GET_TIMEOUT_MS)

    if (typeof g.basisHTML_SND_MSG !== 'function') {
      gescheitert('Daten laden nicht möglich: keine Verbindung zu SoftEngine.')
      return
    }
    g.basisHTML_SND_MSG('GET_RELATION', {
      NR: job.template.nr,
      PARAMS: job.params,
    })
  } catch (error) {
    gescheitert(`Daten laden fehlgeschlagen (Relation Nr. ${job.template.nr}): ${fehlertext(error)}`)
  }
}

export function relationAusfuehren(
  template: LaufzeitRelation,
  params: readonly string[],
  optionen: RelationOptionen = {},
): Promise<RelationAntwort> {
  starteSe()
  const g = seFenster()
  if (template.verb !== 'GET_RELATION') {
    if (typeof g.basisHTML_SND_MSG !== 'function') {
      const text = 'Speichern nicht möglich: keine Verbindung zu SoftEngine. Die Eingabe wurde NICHT übernommen.'
      meldeFehler(text)
      return Promise.resolve({ wert: '', roh: undefined, fehler: text })
    }
    try {
      g.basisHTML_SND_MSG(template.verb, { NR: template.nr, PARAMS: [...params] })
    } catch (error) {
      const text = `Speichern fehlgeschlagen (Relation Nr. ${template.nr}): ${fehlertext(error)}`
      meldeFehler(text)
      return Promise.resolve({ wert: '', roh: undefined, fehler: text })
    }

    return Promise.resolve({ wert: '', roh: undefined })
  }
  return new Promise((resolve) => {
    getQueue.push({ template, params: [...params], resolve, optionen })
    runNextGet()
  })
}

export interface LaufzeitWerte {
  context: Readonly<Record<string, string | undefined>>
  previousResult: string

  stepResults?: readonly string[]

  stepRohErgebnisse?: readonly unknown[]

  gewaehlteZeile?: (geberId: string) => unknown

  // Gesetzt, wenn die Kette gerade EINE Zeile abarbeitet: liefert den Zellwert
  // der Spalte dieser Zeile.
  zeilenZelle?: (blockId: string, spaltenIndex: number) => string
}

function resolveBlockValue(binding: Parameter, runtime: unknown): string {
  if (!istObjekt(runtime)) return ''
  const doc = runtime.document as ParentNode | undefined
  if (!doc || typeof doc.querySelectorAll !== 'function') return ''
  const element = Array.from(doc.querySelectorAll<HTMLElement>(`[${BAUSTEIN_ID_ATTR}]`))
    .find((candidate) => candidate.getAttribute(BAUSTEIN_ID_ATTR) === binding.bausteinId)
  if (!element) return ''
  const raw = (element as unknown as Record<string, unknown>)[binding.wert]
  return raw == null ? '' : String(raw)
}

export function parameterAufloesen(
  binding: Parameter,
  values: LaufzeitWerte,
  runtime: unknown = seFenster(),
): string {
  if (binding.quelle === 'aus') return ''
  if (binding.quelle === 'fixed') return binding.wert
  if (binding.quelle === 'context') return values.context[binding.wert] ?? ''
  if (binding.quelle === 'previous_result') return values.previousResult
  if (binding.quelle === 'step_result') {
    const idx = Number(binding.wert)
    if (!Number.isInteger(idx) || idx < 0) return ''

    const feld = binding.ergebnisFeld ?? ''
    if (feld === '') return values.stepResults?.[idx] ?? ''
    return feldAusAntwort(values.stepRohErgebnisse?.[idx], feld)
  }
  if (binding.quelle === 'block_value') return resolveBlockValue(binding, runtime)
  if (binding.quelle === 'erfassungszelle'
    || binding.quelle === 'aenderungszelle'
    || binding.quelle === 'loeschzelle') {
    const index = Number(binding.wert)
    if (!Number.isInteger(index) || index < 0) return ''
    return values.zeilenZelle?.(binding.bausteinId ?? '', index) ?? ''
  }
  if (binding.quelle === 'gewaehlte_zeile') {
    const zeile = values.gewaehlteZeile?.(binding.bausteinId ?? '')
    return zeile === undefined ? '' : feldLesen(zeile, binding.wert)
  }
  if (!istObjekt(runtime)) return ''

  if (binding.quelle === 'se_variable') {
    const seData = runtime.SEDATA
    if (!istObjekt(seData) || !istObjekt(seData.Daten) || !istObjekt(seData.Daten.VARArrays)) return ''
    const value = seData.Daten.VARArrays[binding.wert]
    return value == null ? '' : String(value)
  }

  const source = quelleAusListe(runtime.FF_DATA_SOURCES, binding.quelleId ?? '')
  if (!source) return ''
  const rows = zeilenAusLieferung(runtime.SEDATA, source.name, source.tabellenId, source.offenerSatz)
  const pindex = values.context.PINDEX ?? ''

  const row = pindex !== '' && source.satzFeld !== ''
    ? rows.find((entry) => feldLesen(entry, source.satzFeld) === pindex)
    : rows[0]
  return row ? feldLesen(row, binding.wert) : ''
}
