import {
  RELATION_VERBS,
  checkPositionFetch,
  type RelationAnswer,
  type RelationVerb,
  type RuntimeRelation,
} from '../core/data/relations'
import { BLOCK_ID_ATTR, type Parameter, type RuntimeValues } from '../core/data/actions'
import type { RuntimeQuery } from '../core/data/deliveries/message'
import { readActionValue } from '../core/block/registry'
import { startSe, onSeAnswer, seWindow } from './bridge'
import {
  sourceFromList,
  fieldRead,
  isObject,
  rowsFromQueryAnswer,
  rowsOfSource,
} from './data'

export function runtimeRelation(id: string): RuntimeRelation | undefined {
  return relationFromList(seWindow().FF_RELATIONS, id)
}

export function relationFromList(list: unknown, id: string): RuntimeRelation | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isObject(entry) || entry.id !== id) continue
    if (typeof entry.verb !== 'string' || !RELATION_VERBS.includes(entry.verb as RelationVerb)) continue
    if (typeof entry.nr !== 'string' || entry.nr === '') continue
    if (!Array.isArray(entry.parameter) || entry.parameter.some((p) => typeof p !== 'string')) continue
    const positions = entry.verb === 'GET_RELATION' ? checkPositionFetch(entry.positions, entry.parameter.length) : null
    return {
      id,
      verb: entry.verb as RelationVerb,
      nr: entry.nr,
      parameter: entry.parameter as string[],
      ...(positions ? { positions } : {}),
    }
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
  if (!isObject(value)) return undefined
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

function resultFromAnswer(raw: unknown): string | undefined {
  const value = parsed(raw)
  if (!isObject(value)) return undefined
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
    } else if (isObject(entry)) {
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
  if (!isObject(value)) return undefined
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
  if (!isObject(value)) return ''
  const direct = fieldRead(value, code)
  if (direct !== '') return direct
  for (const entry of Object.values(value)) {
    const found = fieldFromAnswer(entry, code, depth + 1)
    if (found !== '') return found
  }
  return ''
}

function seMessageKeys(seData: unknown): string[] {
  if (!isObject(seData)) return []
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
  if (!isObject(seData)) return undefined
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

interface HostCalls {
  queue: (GetJob | QueryJob)[]
  callInFlight: boolean
  expiryUntil: number
  expiresCallback: boolean
  expiresReread: boolean
}

const hostCalls: HostCalls = {
  queue: [],
  callInFlight: false,
  expiryUntil: 0,
  expiresCallback: false,
  expiresReread: false,
}

const GET_TIMEOUT_MS = 20_000
const GET_POLL_MS = 100

const EXPIRY_MS = GET_TIMEOUT_MS

function expiryApplies(): boolean {
  return Date.now() < hostCalls.expiryUntil
}

function nextCall(): void {
  if (hostCalls.callInFlight || hostCalls.queue.length === 0) return
  hostCalls.callInFlight = true
  const job = hostCalls.queue.shift()!
  if ('query' in job) {
    sendQuery(job)
    return
  }
  let settled = false
  let expiryUsed = false
  let unsubscribe: (() => void) | null = null
  let poll: ReturnType<typeof setInterval> | null = null
  let timeout: ReturnType<typeof setTimeout> | null = null

  const finish = (value: string, raw: unknown, failed = false): void => {
    if (settled) return
    settled = true
    unsubscribe?.()
    if (poll !== null) clearInterval(poll)
    if (timeout !== null) clearTimeout(timeout)
    hostCalls.callInFlight = false
    job.resolve(failed ? { value, raw, failed } : { value, raw })

    queueMicrotask(nextCall)
  }

  try {
    const g = seWindow()
    const before = new Set(seMessageKeys(g.SEDATA))
    const recordAnswer = job.options.recordAnswer === true

    unsubscribe = onSeAnswer((raw) => {
      if (rowsFromQueryAnswer(raw) !== undefined) return
      const result = recordAnswer ? extractRecordAnswer(raw) : resultFromAnswer(raw)
      if (result === undefined) return
      if (hostCalls.expiresCallback && expiryApplies()) {
        hostCalls.expiresCallback = false
        expiryUsed = true
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
      if (hostCalls.expiresReread && expiryApplies()) {
        hostCalls.expiresReread = false
        expiryUsed = true

        before.add(message.key)
        return
      }
      finish(message.value, message.raw)
    }, GET_POLL_MS)

    timeout = setTimeout(() => {
      if (!expiryUsed) {
        hostCalls.expiresCallback = true
        hostCalls.expiresReread = true
        hostCalls.expiryUntil = Date.now() + EXPIRY_MS
      }
      finish('', undefined, true)
    }, GET_TIMEOUT_MS)

    if (typeof g.basisHTML_SND_MSG !== 'function') {
      finish('', undefined, true)
      return
    }
    g.basisHTML_SND_MSG('GET_RELATION', {
      NR: job.template.nr,
      PARAMS: job.params,
    })
  } catch {
    finish('', undefined, true)
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
      return Promise.resolve({ value: '', raw: undefined, failed: true })
    }
    try {
      g.basisHTML_SND_MSG(template.verb, { NR: template.nr, PARAMS: [...params] })
    } catch {
      return Promise.resolve({ value: '', raw: undefined, failed: true })
    }

    return Promise.resolve({ value: '', raw: undefined })
  }
  return new Promise((resolve) => {
    hostCalls.queue.push({ template, params: [...params], resolve, options })
    nextCall()
  })
}

function fitsToQuery(rows: readonly unknown[], fields: string): boolean {
  const first = rows[0]
  if (first === undefined || fields.trim() === '*') return true
  if (!isObject(first)) return false
  const key = Object.keys(first)
  return fields.split(',').map((f) => f.trim()).filter((f) => f !== '')
    .some((f) => key.some((k) => k === f || k.endsWith(`_${f}`)))
}

function sendQuery(job: QueryJob): void {
  let settled = false
  let unregister: (() => void) | null = null
  let clock: ReturnType<typeof setTimeout> | null = null

  const done = (rows?: unknown[]): void => {
    if (settled) return
    settled = true
    unregister?.()
    if (clock !== null) clearTimeout(clock)
    hostCalls.callInFlight = false
    job.resolve(rows === undefined ? {} : { rows })
    queueMicrotask(nextCall)
  }

  try {
    const g = seWindow()
    unregister = onSeAnswer((raw) => {
      const rows = rowsFromQueryAnswer(raw)
      if (rows === undefined || !fitsToQuery(rows, job.query.fields)) return
      done(rows)
    })
    clock = setTimeout(() => {
      done()
    }, GET_TIMEOUT_MS)
    if (typeof g.basisHTML_SND_MSG !== 'function') {
      done()
      return
    }
    g.basisHTML_SND_MSG('ERPAPICALL', {
      ID: job.query.id,
      ALIAS: job.name,
      FELDER: job.query.fields,
    })
  } catch {
    done()
  }
}

export function queryRun(query: RuntimeQuery, name: string): Promise<QueryAnswer> {
  startSe()
  return new Promise((resolve) => {
    hostCalls.queue.push({ query, name, resolve })
    nextCall()
  })
}

function resolveBlockValue(binding: Parameter, runtime: unknown): string {
  if (!isObject(runtime)) return ''
  const doc = runtime.document as ParentNode | undefined
  if (!doc || typeof doc.querySelectorAll !== 'function') return ''
  const element = Array.from(doc.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`))
    .find((candidate) => candidate.getAttribute(BLOCK_ID_ATTR) === binding.blockId)
  if (!element) return ''
  return readActionValue(element, binding.value)
}

export function parameterResolve(
  binding: Parameter,
  values: RuntimeValues,
  runtime: unknown = seWindow(),
): string {
  if (binding.source === 'omitted') return ''
  if (binding.source === 'fixed') return binding.value
  if (binding.source === 'context') return values.context[binding.value] ?? ''
  if (binding.source === 'previousResult') return values.previousResult
  if (binding.source === 'stepResult') {
    const idx = Number(binding.value)
    if (!Number.isInteger(idx) || idx < 0) return ''

    const field = binding.resultField ?? ''
    if (field === '') return values.stepResults?.[idx] ?? ''
    return fieldFromAnswer(values.stepRawResults?.[idx], field)
  }
  if (binding.source === 'blockValue') return resolveBlockValue(binding, runtime)
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
  if (!isObject(runtime)) return ''

  if (binding.source === 'seVariable') {
    const seData = runtime.SEDATA
    if (!isObject(seData) || !isObject(seData.Daten) || !isObject(seData.Daten.VARArrays)) return ''
    const value = seData.Daten.VARArrays[binding.value]
    return value == null ? '' : String(value)
  }

  const source = sourceFromList(runtime.FF_DATA_SOURCES, binding.sourceId ?? '')
  if (!source) return ''
  const rows = rowsOfSource(source, runtime.SEDATA)
  const pindex = values.context.PINDEX ?? ''

  const row = pindex !== '' && source.recordField !== ''
    ? rows.find((entry) => fieldRead(entry, source.recordField) === pindex)
    : rows[0]
  return row ? fieldRead(row, binding.value) : ''
}
