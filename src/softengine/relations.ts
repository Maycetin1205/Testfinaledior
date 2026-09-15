// Relations-Rufe an SoftEngine: einer zur Zeit, mit Warteschlange und Verfallsmarke.
import {
  RELATIONS_VERBEN,
  type RelationsVorlage,
  type RelationsVerb,
} from '../core/data/relations'
import { BAUSTEIN_ID_ATTR, type Parameter } from '../core/data/aktionen'
import { bootSe, onSeAntwort, seGlobal } from './bridge'
import {
  findRuntimeDataSource,
  getField,
  isRecord,
  rowsFor,
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

export type RuntimeRelation = Pick<RelationsVorlage, 'id' | 'verb' | 'nr' | 'params'>

export function laufzeitRelation(id: string): RuntimeRelation | undefined {
  return findRuntimeRelation(seGlobal().FF_RELATIONS, id)
}

export function findRuntimeRelation(list: unknown, id: string): RuntimeRelation | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isRecord(entry) || entry.id !== id) continue
    if (typeof entry.verb !== 'string' || !RELATIONS_VERBEN.includes(entry.verb as RelationsVerb)) continue
    if (typeof entry.nr !== 'string' || entry.nr === '') continue
    if (!Array.isArray(entry.params) || entry.params.some((p) => typeof p !== 'string')) continue
    return { id, verb: entry.verb as RelationsVerb, nr: entry.nr, params: entry.params as string[] }
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
  if (!isRecord(value)) return undefined
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

export function extractRelationResult(raw: unknown): string | undefined {
  const value = parsed(raw)
  if (!isRecord(value)) return undefined
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
        const found = extractRelationResult(item)
        if (found !== undefined) return found
      }
    } else if (isRecord(entry)) {
      const found = extractRelationResult(entry)
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
  if (!isRecord(value)) return undefined
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

export function extractRelationFeld(raw: unknown, code: string, tiefe = 0): string {
  if (code.trim() === '' || tiefe > 12) return ''
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractRelationFeld(entry, code, tiefe + 1)
      if (found !== '') return found
    }
    return ''
  }
  if (!isRecord(value)) return ''
  const direkt = getField(value, code)
  if (direkt !== '') return direkt
  for (const entry of Object.values(value)) {
    const found = extractRelationFeld(entry, code, tiefe + 1)
    if (found !== '') return found
  }
  return ''
}

function seMessageKeys(seData: unknown): string[] {
  if (!isRecord(seData)) return []
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
  if (!isRecord(seData)) return undefined
  const keys = seMessageKeys(seData)
    .filter((key) => !before.has(key))
    .sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)))
  for (const key of keys) {
    const found = satzAntwort ? extractSatzAntwort(seData[key]) : extractRelationResult(seData[key])
    if (found !== undefined) return { wert: found, roh: seData[key], schluessel: key }
  }
  return undefined
}

export interface RelationOptionen {
  still?: boolean
  satzAntwort?: boolean
}

interface GetJob {
  template: RuntimeRelation
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
    const g = seGlobal()
    const before = new Set(seMessageKeys(g.SEDATA))
    const satzAntwort = job.optionen.satzAntwort === true

    unsubscribe = onSeAntwort((raw) => {
      const result = satzAntwort ? extractSatzAntwort(raw) : extractRelationResult(raw)
      if (result === undefined) return
      if (verfaelltRueckruf && markeGilt()) {
        verfaelltRueckruf = false
        verfallenGenutzt = true
        return
      }
      finish(result, raw)
    })

    poll = setInterval(() => {
      const nachricht = newSeMessageResult(seGlobal().SEDATA, before, satzAntwort)
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

export function executeRelation(
  template: RuntimeRelation,
  params: readonly string[],
  optionen: RelationOptionen = {},
): Promise<RelationAntwort> {
  bootSe()
  const g = seGlobal()
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

export interface RuntimeActionValues {
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
  if (!isRecord(runtime)) return ''
  const doc = runtime.document as ParentNode | undefined
  if (!doc || typeof doc.querySelectorAll !== 'function') return ''
  const element = Array.from(doc.querySelectorAll<HTMLElement>(`[${BAUSTEIN_ID_ATTR}]`))
    .find((candidate) => candidate.getAttribute(BAUSTEIN_ID_ATTR) === binding.blockId)
  if (!element) return ''
  const raw = (element as unknown as Record<string, unknown>)[binding.value]
  return raw == null ? '' : String(raw)
}

export function resolveActionParam(
  binding: Parameter,
  values: RuntimeActionValues,
  runtime: unknown = seGlobal(),
): string {
  if (binding.source === 'aus') return ''
  if (binding.source === 'fixed') return binding.value
  if (binding.source === 'context') return values.context[binding.value] ?? ''
  if (binding.source === 'previous_result') return values.previousResult
  if (binding.source === 'step_result') {
    const idx = Number(binding.value)
    if (!Number.isInteger(idx) || idx < 0) return ''

    const feld = binding.ergebnisFeld ?? ''
    if (feld === '') return values.stepResults?.[idx] ?? ''
    return extractRelationFeld(values.stepRohErgebnisse?.[idx], feld)
  }
  if (binding.source === 'block_value') return resolveBlockValue(binding, runtime)
  if (binding.source === 'erfassungszelle'
    || binding.source === 'aenderungszelle'
    || binding.source === 'loeschzelle') {
    const index = Number(binding.value)
    if (!Number.isInteger(index) || index < 0) return ''
    return values.zeilenZelle?.(binding.blockId ?? '', index) ?? ''
  }
  if (binding.source === 'gewaehlte_zeile') {
    const zeile = values.gewaehlteZeile?.(binding.blockId ?? '')
    return zeile === undefined ? '' : getField(zeile, binding.value)
  }
  if (!isRecord(runtime)) return ''

  if (binding.source === 'se_variable') {
    const seData = runtime.SEDATA
    if (!isRecord(seData) || !isRecord(seData.Daten) || !isRecord(seData.Daten.VARArrays)) return ''
    const value = seData.Daten.VARArrays[binding.value]
    return value == null ? '' : String(value)
  }

  const source = findRuntimeDataSource(runtime.FF_DATA_SOURCES, binding.dataSourceId ?? '')
  if (!source) return ''
  const rows = rowsFor(runtime.SEDATA, source.name, source.tableId, source.offenerSatz)
  const pindex = values.context.PINDEX ?? ''

  const row = pindex !== '' && source.indexField !== ''
    ? rows.find((entry) => getField(entry, source.indexField) === pindex)
    : rows[0]
  return row ? getField(row, binding.value) : ''
}
