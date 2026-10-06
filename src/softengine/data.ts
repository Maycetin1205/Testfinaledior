import type { RuntimeSource } from '../core/data/dataSources'
import { runtimeDeliveryFrom } from '../core/data/deliveries/deliveries'
import { isUnread } from '../core/unread'
import { fetchedRowsFor } from './fetchedRows'

export type JsonObject = Record<string, unknown>

export function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null
}

export function sourceFromList(list: unknown, id: string): RuntimeSource | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isObject(entry) || entry.id !== id) continue
    if (typeof entry.name !== 'string' || typeof entry.tableId !== 'string') continue
    return {
      id,
      name: entry.name,
      tableId: entry.tableId,
      recordField: typeof entry.recordField === 'string' ? entry.recordField : '',
      delivery: runtimeDeliveryFrom(entry),
    }
  }
  return undefined
}

// The webware names its list and its element in the answer and puts the record
// layout and the field descriptions beside the rows; the winui sends rows only.
export function rowsFromQueryAnswer(raw: unknown): unknown[] | undefined {
  let answer = raw
  if (typeof answer === 'string') {
    try { answer = JSON.parse(answer) } catch { return undefined }
  }
  if (!isObject(answer) || Array.isArray(answer)) return undefined

  const listName = answer.LISTENNAME
  const elementName = answer.ELEMENTNAME
  if (typeof listName === 'string' && typeof elementName === 'string') {
    const named = answer[listName]
    if (isObject(named)) {
      const rows = named[elementName]
      if (Array.isArray(rows)) return rows
    }
  }

  const key = Object.keys(answer).find((k) => /LISTE$/i.test(k))
  if (key === undefined) return undefined
  const list = answer[key]
  if (Array.isArray(list)) return list
  if (!isObject(list)) return []
  const contents = Object.entries(list)
    .filter(([k]) => k !== 'SAT' && k !== 'TFELD')
    .map(([, v]) => v)
  const row = contents.find((v): v is unknown[] => Array.isArray(v))
  if (row) return row
  const single = contents.find(isObject)
  return single === undefined ? [] : [single]
}

function asTrimmedString(v: unknown): string {
  if (v == null) return ''
  if (isUnread<{ WERT: string }>(v)) {
    const content = v.WERT
    return content == null || typeof content === 'object' ? '' : String(content).trim()
  }
  return String(v).trim()
}

export function fieldRead(row: unknown, code: string): string {
  if (!isObject(row) || code === '') return ''
  const key = code.trim()
  const direct = asTrimmedString(row[key])
  if (direct !== '') return direct
  for (const rk of Object.keys(row)) {
    if (rk === key || rk.startsWith(`${key}_`) || rk.endsWith(`_${key}`)) {
      const v = asTrimmedString(row[rk])
      if (v !== '') return v
    }
  }
  const m = /^(\d+)_(\d+)$/.exec(key)
  if (!m) return ''

  const rawSource = row.SATZNEU ?? row.SATZ ?? row.satzneu ?? row.satz ?? row.RAW ?? row.raw
  const raw = rawSource == null ? '' : String(rawSource)
  if (raw === '') return ''
  const pos = Number(m[1])
  const len = Number(m[2])
  if (len <= 0) return ''
  return raw.substring(pos, pos + len).trim()
}

export function fieldWrite(row: unknown, code: string, value: string): boolean {
  if (!isObject(row) || code === '') return false
  const key = code.trim()
  let written = false

  for (const rk of Object.keys(row)) {
    if (rk === key || rk.startsWith(`${key}_`) || rk.endsWith(`_${key}`)) {
      row[rk] = value
      written = true
    }
  }

  const m = /^(\d+)_(\d+)$/.exec(key)
  if (m) {
    const rawKeys = ['SATZNEU', 'SATZ', 'satzneu', 'satz', 'RAW', 'raw'] as const
    const rawKey = rawKeys.find((k) => typeof row[k] === 'string')
    if (rawKey) {
      const raw = row[rawKey] as string
      const pos = Number(m[1])
      const len = Number(m[2])
      if (len > 0) {
        const field = value.length > len ? value.slice(0, len) : value.padEnd(len, ' ')
        const padded = raw.length < pos ? raw.padEnd(pos, ' ') : raw
        row[rawKey] = padded.slice(0, pos) + field + padded.slice(pos + len)
        written = true
      }
    }
  }
  return written
}

function jsonOrNothing(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function rowsOfEntry(entry: unknown): unknown[] {
  if (!isObject(entry)) return Array.isArray(entry) ? entry : []
  const candidates = [
    entry.Zeilen, entry.zeilen, entry.Saetze, entry.saetze,
    entry.Rows, entry.rows, entry.Daten, entry.daten,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
    if (typeof c === 'string') {
      const parsed = jsonOrNothing(c)
      if (Array.isArray(parsed)) return parsed
    }
  }
  return []
}

function sameAlias(a: unknown, alias: string): boolean {
  return asTrimmedString(a).toLowerCase() === alias.trim().toLowerCase()
}

function varBlockOf(data: JsonObject): JsonObject | undefined {
  for (const key of ['Var', 'VAR', 'var']) {
    const block = data[key]
    if (isObject(block)) return block
  }
  return undefined
}

function openRecordRows(seData: unknown, tableId: string): unknown[] {
  if (!isObject(seData) || !isObject(seData.Daten)) return []
  const id = tableId.trim()
  if (id === '') return []
  const varBlock = varBlockOf(seData.Daten)
  if (!varBlock) return []

  const record: JsonObject = {}
  const window = varBlock.WINDOW_VARIABLE ?? varBlock.Window_Variable
  if (isObject(window)) {
    const prefix = id.toUpperCase() + '_'
    for (const key of Object.keys(window)) {
      if (key.toUpperCase().startsWith(prefix)) record[key] = window[key]
    }
  }
  const own = varBlock[id] ?? varBlock[id.toUpperCase()]
  if (isObject(own)) {
    for (const key of Object.keys(own)) {
      if (asTrimmedString(own[key]) !== '' || !(key in record)) record[key] = own[key]
    }
  }
  return Object.keys(record).length === 0 ? [] : [record]
}

function loopRows(data: JsonObject, alias: string): unknown[] {
  const sfl = data.SEFileLoop
  if (Array.isArray(sfl)) {
    for (const entry of sfl) {
      if (isObject(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  } else if (isObject(sfl)) {
    for (const key of Object.keys(sfl)) {
      const entry = sfl[key]
      if (sameAlias(key, alias)
        || (isObject(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias)))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  }
  return []
}

function apiCallRows(data: JsonObject, alias: string): unknown[] {
  for (const key of ['ErpApiCall', 'ERPAPICALL', 'erpapicall']) {
    const api = data[key]
    if (!isObject(api)) continue
    for (const entry of Object.keys(api)) {
      if (!sameAlias(entry, alias)) continue
      const rows = rowsOfEntry(api[entry])
      if (rows.length > 0) return rows
    }
  }
  return []
}

function tableRows(data: JsonObject, alias: string, tableId: string): unknown[] {
  const tab = data.Tabellen
  if (!isObject(tab)) return []
  const keys = [alias, alias.toUpperCase(), alias.toLowerCase(), tableId]
  for (const key of keys) {
    if (key !== '' && key in tab) {
      const rows = rowsOfEntry(tab[key])
      if (rows.length > 0) return rows
    }
  }
  for (const key of Object.keys(tab)) {
    if (sameAlias(key, alias)) {
      const rows = rowsOfEntry(tab[key])
      if (rows.length > 0) return rows
    }
  }
  return []
}

// An ERP mask arrives as one record: its values, the plain texts and the field
// descriptions under MASKE.
function maskRows(data: JsonObject, alias: string): unknown[] {
  const masks = data.Masken
  if (!isObject(masks)) return []
  for (const key of Object.keys(masks)) {
    const entry = masks[key]
    if (sameAlias(key, alias) && isObject(entry) && !Array.isArray(entry)) return [entry]
  }
  return []
}

// Only the SEFILELOOP place is proven by a test in SoftEngine; the mask looks
// for the alias in every block SoftEngine fills by alias.
const PUSHED_LISTS = [loopRows, apiCallRows, tableRows, maskRows]

function pushedRows(seData: unknown, alias: string, tableId: string, openRecord: boolean): unknown[] {
  if (!isObject(seData) || !isObject(seData.Daten)) return []
  if (openRecord) return openRecordRows(seData, tableId)
  for (const read of PUSHED_LISTS) {
    const rows = read(seData.Daten, alias, tableId)
    if (rows.length > 0) return rows
  }
  return []
}

export function rowsOfSource(source: RuntimeSource, seData: unknown): unknown[] {
  const delivery = source.delivery
  if (delivery.kind !== 'push') return fetchedRowsFor(source.name) ?? []
  return pushedRows(seData, source.name, source.tableId, delivery.openRecord)
}

export function dataFromContent(raw: unknown): JsonObject | undefined {
  let data = raw
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return undefined }
  }
  if (!isObject(data) || !isObject(data.Daten)) return undefined
  const block = data.Daten
  if (!block.SEFileLoop && !block.Tabellen && !block.ErpApiCall && !block.Masken && !varBlockOf(block)) {
    return undefined
  }
  return block
}

export function messagesContent(eventData: unknown): unknown {
  let d = eventData
  if (typeof d === 'string') {
    try { d = JSON.parse(d) } catch { return undefined }
  }
  if (!isObject(d) || !isObject(d.MSG)) return undefined
  return d.MSG.DATA
}
