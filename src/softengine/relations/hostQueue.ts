import type { RelationAnswer, RuntimeRelation } from '../../core/data/relations'
import type { RuntimeQuery } from '../../core/data/deliveries/message'
import { onSeAnswer, seWindow, startSe } from '../bridge'
import { isObject, rowsFromQueryAnswer } from '../data'
import { extractRecordAnswer, newSeMessageResult, resultFromAnswer, seMessageKeys } from './answer'

// Sending to SoftEngine and waiting for the answer. The answers carry no
// sender, so one question is out at a time: GET relations and ERP queries
// share one queue.

export interface RelationOptions {
  // The answer is the raw record, not one value out of it.
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

// What narrows the question, resolved: the kind of document and the address
// whose documents are asked for; empty asks for all.
export interface QueryKeys {
  documentKind: string
  address: string
}

export const ALL_RECORDS: QueryKeys = { documentKind: '', address: '' }

interface QueryJob {
  query: RuntimeQuery
  name: string
  keys: QueryKeys
  resolve: (answer: QueryAnswer) => void
}

interface HostCalls {
  queue: (GetJob | QueryJob)[]
  callInFlight: boolean
  // After a question ran out of time, its late answer must not be taken for
  // the next question's: once by the callback, once by the reread.
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
  sendGet(job)
}

// The answer arrives by the callback or, read again, as a new message in
// SEDATA; whichever comes first ends the wait.
function sendGet(job: GetJob): void {
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

// The rows of an answer belong to the query whose fields they carry.
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
    // The keys SoftEngine's own masks give BELEG.GET.
    const { documentKind, address } = job.keys
    g.basisHTML_SND_MSG('ERPAPICALL', {
      ID: job.query.id,
      ALIAS: job.name,
      FELDER: job.query.fields,
      ...(documentKind === '' ? {} : { BELART: documentKind }),
      ...(address === '' ? {} : { VON_ADRNR: address, BIS_ADRNR: address }),
    })
  } catch {
    done()
  }
}

export function queryRun(query: RuntimeQuery, name: string, keys: QueryKeys = ALL_RECORDS): Promise<QueryAnswer> {
  startSe()
  return new Promise((resolve) => {
    hostCalls.queue.push({ query, name, keys, resolve })
    nextCall()
  })
}
