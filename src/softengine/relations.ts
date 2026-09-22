import {
  RELATION_VERBS,
  type RelationTemplate,
  type RelationVerb,
} from '../core/data/relations'
import { BLOCK_ID_ATTR, type Parameter } from '../core/data/actions'
import { startSe, onSeAnswer, seWindow } from './bridge'
import {
  sourceFromList,
  fieldRead,
  isObjekt,
  rowsFromQueryAnswer,
  rowsFromDelivery,
  type RuntimeQuery,
} from './data'
import { reportError } from './report'

export interface RelationAnswer {
  value: string

  raw: unknown

  error?: string
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export type RuntimeRelation = Pick<RelationTemplate, 'id' | 'verb' | 'nr' | 'parameter'>

export function runtimeRelation(id: string): RuntimeRelation | undefined {
  return relationFromList(seWindow().FF_RELATIONS, id)
}

export function relationFromList(list: unknown, id: string): RuntimeRelation | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isObjekt(entry) || entry.id !== id) continue
    if (typeof entry.verb !== 'string' || !RELATION_VERBS.includes(entry.verb as RelationVerb)) continue
    if (typeof entry.nr !== 'string' || entry.nr === '') continue
    if (!Array.isArray(entry.parameter) || entry.parameter.some((p) => typeof p !== 'string')) continue
    return { id, verb: entry.verb as RelationVerb, nr: entry.nr, parameter: entry.parameter as string[] }
  }
  return undefined
}

const RECORD_KEY = ['RESULT', 'result'] as const

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
  if (!isObjekt(value)) return undefined
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

export function resultFromAnswer(raw: unknown): string | undefined {
  const value = parsed(raw)
  if (!isObjekt(value)) return undefined
  for (const key of RESULT_KEYS) {
    if (!(key in value)) continue
    const found = firstScalar(value[key], 0)
    if (found !== undefined) return found
  }

  for (const key of RECORD_KEY) {
    if (typeof value[key] === 'string') return ''
  }
  for (const entry of Object.values(value)) {
    if (Array.isArray(entry)) {
      for (const item of entry) {
        const found = resultFromAnswer(item)
        if (found !== undefined) return found
      }
    } else if (isObjekt(entry)) {
      const found = resultFromAnswer(entry)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function extractRecordAnswer(raw: unknown, depth = 0): string | undefined {
  if (depth > 12) return undefined
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractRecordAnswer(entry, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (!isObjekt(value)) return undefined
  for (const key of RECORD_KEY) {
    const found = value[key]
    if (typeof found === 'string') return found
    if (typeof found === 'number' || typeof found === 'boolean') return String(found)
  }
  for (const entry of Object.values(value)) {
    const found = extractRecordAnswer(entry, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export function fieldFromAnswer(raw: unknown, code: string, depth = 0): string {
  if (code.trim() === '' || depth > 12) return ''
  const value = typeof raw === 'string' ? parsed(raw) : raw
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = fieldFromAnswer(entry, code, depth + 1)
      if (found !== '') return found
    }
    return ''
  }
  if (!isObjekt(value)) return ''
  const direkt = fieldRead(value, code)
  if (direkt !== '') return direkt
  for (const entry of Object.values(value)) {
    const found = fieldFromAnswer(entry, code, depth + 1)
    if (found !== '') return found
  }
  return ''
}

function seMessageKeys(seData: unknown): string[] {
  if (!isObjekt(seData)) return []
  return Object.keys(seData).filter((key) => /^Message\d+$/.test(key))
}

export interface NewMessage extends RelationAnswer {
  key: string
}

function newSeMessageResult(
  seData: unknown,
  before: ReadonlySet<string>,
  recordAnswer = false,
): NewMessage | undefined {
  if (!isObjekt(seData)) return undefined
  const keys = seMessageKeys(seData)
    .filter((key) => !before.has(key))
    .sort((a, b) => Number(b.slice(7)) - Number(a.slice(7)))
  for (const key of keys) {
    const found = recordAnswer ? extractRecordAnswer(seData[key]) : resultFromAnswer(seData[key])
    if (found !== undefined) return { value: found, raw: seData[key], key: key }
  }
  return undefined
}

export interface RelationOptions {
  silent?: boolean
  recordAnswer?: boolean
}

interface GetJob {
  template: RuntimeRelation
  params: string[]
  resolve: (answer: RelationAnswer) => void
  options: RelationOptions
}

export interface QueryAnswer {
  rows?: unknown[]
}

interface QueryJob {
  query: RuntimeQuery
  name: string
  resolve: (answer: QueryAnswer) => void
}

const queue: (GetJob | QueryJob)[] = []
let callInFlight = false
const GET_TIMEOUT_MS = 20_000
const GET_POLL_MS = 100

const EXPIRY_MS = GET_TIMEOUT_MS
let expiredTo = 0
let expiresCallback = false
let expiresReread = false

function markApplies(): boolean {
  return Date.now() < expiredTo
}

export function setExpiryBack(): void {
  expiresCallback = false
  expiresReread = false
  expiredTo = 0
}

function nextCall(): void {
  if (callInFlight || queue.length === 0) return
  callInFlight = true
  const job = queue.shift()!
  if ('query' in job) {
    spotQuery(job)
    return
  }
  let settled = false
  let expiredGenutzt = false
  let unsubscribe: (() => void) | null = null
  let poll: ReturnType<typeof setInterval> | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null

  const finish = (value: string, raw: unknown, error?: string): void => {
    if (settled) return
    settled = true
    unsubscribe?.()
    if (poll !== null) clearInterval(poll)
    if (timeout !== null) clearTimeout(timeout)
    callInFlight = false
    job.resolve(error === undefined ? { value, raw } : { value, raw, error })

    queueMicrotask(nextCall)
  }

  const failed = (text: string): void => {
    if (!job.options.silent) reportError(text)
    finish('', undefined, text)
  }

  try {
    const g = seWindow()
    const before = new Set(seMessageKeys(g.SEDATA))
    const recordAnswer = job.options.recordAnswer === true

    unsubscribe = onSeAnswer((raw) => {
      if (rowsFromQueryAnswer(raw) !== undefined) return
      const result = recordAnswer ? extractRecordAnswer(raw) : resultFromAnswer(raw)
      if (result === undefined) return
      if (expiresCallback && markApplies()) {
        expiresCallback = false
        expiredGenutzt = true
        return
      }
      finish(result, raw)
    })

    poll = setInterval(() => {
      const message = newSeMessageResult(seWindow().SEDATA, before, recordAnswer)
      if (message === undefined) return
      if (rowsFromQueryAnswer(message.raw) !== undefined) {
        before.add(message.key)
        return
      }
      if (expiresReread && markApplies()) {
        expiresReread = false
        expiredGenutzt = true

        before.add(message.key)
        return
      }
      finish(message.value, message.raw)
    }, GET_POLL_MS)

    timeout = setTimeout(() => {
      if (!expiredGenutzt) {
        expiresCallback = true
        expiresReread = true
        expiredTo = Date.now() + EXPIRY_MS
      }
      failed(`Daten laden: SoftEngine hat nicht geantwortet (Relation Nr. ${job.template.nr}).`)
    }, GET_TIMEOUT_MS)

    if (typeof g.basisHTML_SND_MSG !== 'function') {
      failed('Daten laden nicht möglich: keine Verbindung zu SoftEngine.')
      return
    }
    g.basisHTML_SND_MSG('GET_RELATION', {
      NR: job.template.nr,
      PARAMS: job.params,
    })
  } catch (error) {
    failed(`Daten laden fehlgeschlagen (Relation Nr. ${job.template.nr}): ${errorText(error)}`)
  }
}

export function relationRun(
  template: RuntimeRelation,
  params: readonly string[],
  options: RelationOptions = {},
): Promise<RelationAnswer> {
  startSe()
  const g = seWindow()
  if (template.verb !== 'GET_RELATION') {
    if (typeof g.basisHTML_SND_MSG !== 'function') {
      const text = 'Speichern nicht möglich: keine Verbindung zu SoftEngine. Die Eingabe wurde NICHT übernommen.'
      reportError(text)
      return Promise.resolve({ value: '', raw: undefined, error: text })
    }
    try {
      g.basisHTML_SND_MSG(template.verb, { NR: template.nr, PARAMS: [...params] })
    } catch (error) {
      const text = `Speichern fehlgeschlagen (Relation Nr. ${template.nr}): ${errorText(error)}`
      reportError(text)
      return Promise.resolve({ value: '', raw: undefined, error: text })
    }

    return Promise.resolve({ value: '', raw: undefined })
  }
  return new Promise((resolve) => {
    queue.push({ template, params: [...params], resolve, options })
    nextCall()
  })
}

function fitsToQuery(rows: readonly unknown[], fields: string): boolean {
  const first = rows[0]
  if (first === undefined || fields.trim() === '*') return true
  if (!isObjekt(first)) return false
  const key = Object.keys(first)
  return fields.split(',').map((f) => f.trim()).filter((f) => f !== '')
    .some((f) => key.some((k) => k === f || k.endsWith(`_${f}`)))
}

function spotQuery(job: QueryJob): void {
  let settled = false
  let unregister: (() => void) | null = null
  let clock: ReturnType<typeof setTimeout> | null = null

  const done = (rows?: unknown[]): void => {
    if (settled) return
    settled = true
    unregister?.()
    if (clock !== null) clearTimeout(clock)
    callInFlight = false
    job.resolve(rows === undefined ? {} : { rows })
    queueMicrotask(nextCall)
  }
  const failed = (text: string): void => {
    reportError(text)
    done()
  }

  try {
    const g = seWindow()
    unregister = onSeAnswer((raw) => {
      const rows = rowsFromQueryAnswer(raw)
      if (rows === undefined || !fitsToQuery(rows, job.query.fields)) return
      done(rows)
    })
    clock = setTimeout(() => {
      failed(`„${job.name}“ laden: SoftEngine hat nicht geantwortet (${job.query.id}).`)
    }, GET_TIMEOUT_MS)
    if (typeof g.basisHTML_SND_MSG !== 'function') {
      failed(`„${job.name}“ laden nicht möglich: keine Verbindung zu SoftEngine.`)
      return
    }
    g.basisHTML_SND_MSG('ERPAPICALL', {
      ID: job.query.id,
      ALIAS: job.name,
      FELDER: job.query.fields,
    })
  } catch (error) {
    failed(`„${job.name}“ laden fehlgeschlagen (${job.query.id}): ${errorText(error)}`)
  }
}

export function queryRun(query: RuntimeQuery, name: string): Promise<QueryAnswer> {
  startSe()
  return new Promise((resolve) => {
    queue.push({ query, name, resolve })
    nextCall()
  })
}

export interface RuntimeValues {
  context: Readonly<Record<string, string | undefined>>
  previousResult: string

  stepResults?: readonly string[]

  stepRawResults?: readonly unknown[]

  chosenRow?: (geberId: string) => unknown

  rowsCell?: (blockId: string, columnsIndex: number) => string
}

function resolveBlockValue(binding: Parameter, runtime: unknown): string {
  if (!isObjekt(runtime)) return ''
  const doc = runtime.document as ParentNode | undefined
  if (!doc || typeof doc.querySelectorAll !== 'function') return ''
  const element = Array.from(doc.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`))
    .find((candidate) => candidate.getAttribute(BLOCK_ID_ATTR) === binding.blockId)
  if (!element) return ''
  const raw = (element as unknown as Record<string, unknown>)[binding.value]
  return raw == null ? '' : String(raw)
}

export function parameterResolve(
  binding: Parameter,
  values: RuntimeValues,
  runtime: unknown = seWindow(),
): string {
  if (binding.source === 'from') return ''
  if (binding.source === 'fixed') return binding.value
  if (binding.source === 'context') return values.context[binding.value] ?? ''
  if (binding.source === 'previous_result') return values.previousResult
  if (binding.source === 'step_result') {
    const idx = Number(binding.value)
    if (!Number.isInteger(idx) || idx < 0) return ''

    const field = binding.resultField ?? ''
    if (field === '') return values.stepResults?.[idx] ?? ''
    return fieldFromAnswer(values.stepRawResults?.[idx], field)
  }
  if (binding.source === 'block_value') return resolveBlockValue(binding, runtime)
  if (binding.source === 'captureCell'
    || binding.source === 'changeCell'
    || binding.source === 'deleteCell') {
    const index = Number(binding.value)
    if (!Number.isInteger(index) || index < 0) return ''
    return values.rowsCell?.(binding.blockId ?? '', index) ?? ''
  }
  if (binding.source === 'chosenRow') {
    const row = values.chosenRow?.(binding.blockId ?? '')
    return row === undefined ? '' : fieldRead(row, binding.value)
  }
  if (!isObjekt(runtime)) return ''

  if (binding.source === 'seVariable') {
    const seData = runtime.SEDATA
    if (!isObjekt(seData) || !isObjekt(seData.Daten) || !isObjekt(seData.Daten.VARArrays)) return ''
    const value = seData.Daten.VARArrays[binding.value]
    return value == null ? '' : String(value)
  }

  const source = sourceFromList(runtime.FF_DATA_SOURCES, binding.sourceId ?? '')
  if (!source) return ''
  const rows = rowsFromDelivery(runtime.SEDATA, source.name, source.tableId, source.openRecord)
  const pindex = values.context.PINDEX ?? ''

  const row = pindex !== '' && source.recordField !== ''
    ? rows.find((entry) => fieldRead(entry, source.recordField) === pindex)
    : rows[0]
  return row ? fieldRead(row, binding.value) : ''
}
