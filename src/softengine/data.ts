import { checkGetValue, type GetValue } from '../core/data/getValue'
import { POS_LEN, checkLoadRelation, type LoadRelation } from '../core/data/fetchRelation'
import { fetchedRowsFor } from './fetchedRows'

export type Objekt = Record<string, unknown>

export function isObjekt(v: unknown): v is Objekt {
  return typeof v === 'object' && v !== null
}

export type RuntimeLoadRelation = LoadRelation & { extraFields: readonly string[] }

export type RuntimeGetValue = GetValue & { fields: readonly string[] }

export interface RuntimeQuery {
  id: string
  fields: string
}

export interface RuntimeSource {
  id: string
  name: string
  tableId: string
  recordField: string

  openRecord: boolean
  loadRelation?: RuntimeLoadRelation
  getValue?: RuntimeGetValue
  query?: RuntimeQuery
}

export function sourceFromList(list: unknown, id: string): RuntimeSource | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isObjekt(entry) || entry.id !== id) continue
    if (typeof entry.name !== 'string' || typeof entry.tableId !== 'string') continue

    let loadRelation: RuntimeLoadRelation | undefined
    const checked = checkLoadRelation(entry.loadRelation)
    if (checked && isObjekt(entry.loadRelation)) {
      const zf = entry.loadRelation.extraFields
      const extraFields = Array.isArray(zf)
        ? zf.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
        : []
      loadRelation = { ...checked, extraFields }
    }

    let getValue: RuntimeGetValue | undefined
    const checkedValue = checkGetValue(entry.getValue)
    if (checkedValue && isObjekt(entry.getValue)) {
      const raw = entry.getValue.fields
      const fields = Array.isArray(raw)
        ? raw.filter((f): f is string => typeof f === 'string' && f !== '')
        : []
      getValue = { ...checkedValue, fields }
    }

    const rawQuery = entry.query
    const query = isObjekt(rawQuery) && typeof rawQuery.id === 'string'
      && rawQuery.id !== '' && typeof rawQuery.fields === 'string'
      ? { id: rawQuery.id, fields: rawQuery.fields }
      : undefined
    return {
      id,
      name: entry.name,
      tableId: entry.tableId,
      recordField: typeof entry.recordField === 'string' ? entry.recordField : '',
      openRecord: entry.openRecord === true,
      ...(loadRelation ? { loadRelation } : {}),
      ...(getValue ? { getValue } : {}),
      ...(query ? { query } : {}),
    }
  }
  return undefined
}

export function rowsFromQueryAnswer(raw: unknown): unknown[] | undefined {
  let answer = raw
  if (typeof answer === 'string') {
    try { answer = JSON.parse(answer) } catch { return undefined }
  }
  if (!isObjekt(answer) || Array.isArray(answer)) return undefined
  const key = Object.keys(answer).find((k) => /LISTE$/i.test(k))
  if (key === undefined) return undefined
  const list = answer[key]
  if (Array.isArray(list)) return list
  if (!isObjekt(list)) return []
  const contents = Object.values(list)
  const row = contents.find((v): v is unknown[] => Array.isArray(v))
  if (row) return row
  const single = contents.find(isObjekt)
  return single === undefined ? [] : [single]
}

function asTrimmedString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object' && !Array.isArray(v)) {
    const content = (v as Record<string, unknown>).WERT
    return content == null || typeof content === 'object' ? '' : String(content).trim()
  }
  return String(v).trim()
}

export function fieldRead(row: unknown, code: string): string {
  if (!isObjekt(row) || code === '') return ''
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

export function recordIndexOf(source: { recordField: string }, row: unknown): string {
  return source.recordField === '' ? '' : fieldRead(row, source.recordField)
}

export function fieldWrite(row: unknown, code: string, value: string): boolean {
  if (!isObjekt(row) || code === '') return false
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
  if (!isObjekt(entry)) return Array.isArray(entry) ? entry : []
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

function varBlockOf(data: Objekt): Objekt | undefined {
  for (const key of ['Var', 'VAR', 'var']) {
    const block = data[key]
    if (isObjekt(block)) return block
  }
  return undefined
}

function openRecordRows(seData: unknown, tableId: string): unknown[] {
  if (!isObjekt(seData) || !isObjekt(seData.Daten)) return []
  const id = tableId.trim()
  if (id === '') return []
  const varBlock = varBlockOf(seData.Daten)
  if (!varBlock) return []

  const record: Objekt = {}
  const window = varBlock.WINDOW_VARIABLE ?? varBlock.Window_Variable
  if (isObjekt(window)) {
    const prefix = id.toUpperCase() + '_'
    for (const key of Object.keys(window)) {
      if (key.toUpperCase().startsWith(prefix)) record[key] = window[key]
    }
  }
  const own = varBlock[id] ?? varBlock[id.toUpperCase()]
  if (isObjekt(own)) {
    for (const key of Object.keys(own)) {
      if (asTrimmedString(own[key]) !== '' || !(key in record)) record[key] = own[key]
    }
  }
  return Object.keys(record).length === 0 ? [] : [record]
}

export function rowsFromDelivery(
  seData: unknown,
  alias: string,
  idbId: string,

  openRecord = false,
): unknown[] {
  if (!isObjekt(seData) || !isObjekt(seData.Daten)) return []
  if (openRecord) return openRecordRows(seData, idbId)
  const data = seData.Daten

  const sfl = data.SEFileLoop
  if (Array.isArray(sfl)) {
    for (const entry of sfl) {
      if (isObjekt(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  } else if (isObjekt(sfl)) {
    for (const key of Object.keys(sfl)) {
      const entry = sfl[key]
      if (sameAlias(key, alias)
        || (isObjekt(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias)))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  }

  for (const key of ['ErpApiCall', 'ERPAPICALL', 'erpapicall']) {
    const api = data[key]
    if (!isObjekt(api)) continue
    for (const entry of Object.keys(api)) {
      if (!sameAlias(entry, alias)) continue
      const rows = rowsOfEntry(api[entry])
      if (rows.length > 0) return rows
    }
  }

  const tab = data.Tabellen
  if (isObjekt(tab)) {
    const keys = [alias, alias.toUpperCase(), alias.toLowerCase(), idbId]
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
  }

  return fetchedRowsFor(alias) ?? []
}

export function dataFromContent(raw: unknown): Objekt | undefined {
  let data = raw
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return undefined }
  }
  if (!isObjekt(data) || !isObjekt(data.Daten)) return undefined
  const block = data.Daten
  if (!block.SEFileLoop && !block.Tabellen && !block.ErpApiCall && !varBlockOf(block)) {
    return undefined
  }
  return block
}

export function messagesContent(eventData: unknown): unknown {
  let d = eventData
  if (typeof d === 'string') {
    try { d = JSON.parse(d) } catch { return undefined }
  }
  if (!isObjekt(d) || !isObjekt(d.MSG)) return undefined
  return d.MSG.DATA
}
