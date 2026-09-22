import { SOURCES_DIVIDER, splitBinding } from '../block/blockType'
import { getValueOf, checkGetValue, type GetValue } from './getValue'
import type { EntryProblem } from './loadProblem'
import { loadRelationOf, POS_LEN, checkLoadRelation, type LoadRelation } from './fetchRelation'
import {
  sourceKind,
  SOURCE_KIND_IDS,
  SOURCE_KINDS,
  tableKeyNeeded,
  type SourceKindId,
} from './sourceKinds'

export { sourceKind, SOURCE_KIND_IDS, SOURCE_KINDS, tableKeyNeeded, type SourceKindId }
export {
  getValueOf,
  GET_VALUE_SOURCES,
  getValueSourceAllowed,
  sourcesFromGetValue,
  type GetValue,
} from './getValue'
export {
  fieldsBehindCut,
  LOAD_RELATION_STANDARD,
  loadRelationOf,
  relationNrFromInput,
  type LoadRelation,
} from './fetchRelation'
export {
  fieldPrefixFromInput,
  fieldCode,
  keyDisplay,
  keyFromInput,
  headerKeyFromInput,
  sourcesKey,
  columnsNameFromInput,
} from './sourceInput'

export const ICON_MAX = 200

export interface DataField {
  code: string

  name: string

  icon?: number
}

export interface DataSource {
  id: string

  name: string

  kind: SourceKindId

  idbId?: string

  recordField?: string

  headerKeyIndex?: string

  delivery?: 'list' | 'openRecord'

  loadRelation?: LoadRelation

  getValue?: GetValue

  fieldPrefix?: string

  area?: string

  fields: readonly DataField[]
}

export function areaOf(source: DataSource): string {
  return (source.area ?? '').trim().toUpperCase()
}

export function fetchesSelf(source: DataSource): boolean {
  return loadRelationOf(source) !== null || getValueOf(source) !== null || fetchesToOpen(source)
}

export function fetchesToOpen(source: DataSource): boolean {
  return sourceKind(source.kind).orderBlock === 'erpapicall'
}

export function fieldPlainName(
  binding: string,
  ownSourceId: string,
  sources: readonly DataSource[],
): string {
  const { sourceId, code } = splitBinding(binding)
  const wanted = sourceId === '' ? ownSourceId : sourceId
  if (wanted === '' || code === '') return ''
  const source = sources.find((s) => s.id === wanted)
  return source?.fields.find((f) => f.code === code)?.name ?? ''
}

export function isOpenRecord(source: DataSource): boolean {
  return sourceKind(source.kind).varPossible && source.delivery === 'openRecord'
}

export function recordNumberOf(source: DataSource): string {
  if (!sourceKind(source.kind).recordNumberPossible) return ''
  return (source.recordField ?? '').trim()
}

export function aliasOf(name: string): string {
  return name.trim().toLowerCase()
}

export function withUniqueNames(sources: readonly DataSource[]): DataSource[] {
  const assign = new Set<string>()
  return sources.map((s) => {
    let name = s.name
    for (let nr = 2; assign.has(aliasOf(name)); nr++) name = `${s.name.trim()} ${nr}`
    assign.add(aliasOf(name))
    return name === s.name ? s : { ...s, name }
  })
}

export function tableIdOf(source: DataSource): string {
  const fixed = sourceKind(source.kind).tableId
  return fixed === '' ? (source.idbId ?? '') : fixed
}

export function orderedFields(
  source: DataSource,
  used?: ReadonlySet<string>,
  getKey: readonly string[] = [],
): string {
  const withKeys = (codes: string[]): string[] => {
    for (const code of getKey) {
      if (!codes.includes(code)) codes.push(code)
    }
    return codes
  }

  const onlyUsed = (front: readonly string[], read: ReadonlySet<string>): string[] => {
    const codes = [...front]
    for (const f of source.fields) {
      if (read.has(f.code) && !codes.includes(f.code)) codes.push(f.code)
    }
    for (const code of read) {
      if (!codes.includes(code)) codes.push(code)
    }
    return withKeys(codes)
  }

  const index = recordNumberOf(source)
  const front = index === '' ? [] : [index]

  if (sourceKind(source.kind).fieldsSingle) {
    if (!used || used.size === 0) {
      return withKeys(source.fields.map((f) => f.code)).join(',')
    }
    return onlyUsed(front, used).join(',')
  }

  if (!used || used.size === 0) return '*'

  const codes = onlyUsed(front, used)

  return codes.every((code) => POS_LEN.test(code)) ? codes.join(',') : '*'
}

export function loopOrder(sources: readonly DataSource[]): DataSource[] {
  const standalone: DataSource[] = []
  const underHeaderKey: DataSource[] = []
  for (const source of sources) {
    if (sourceKind(source.kind).headerKeyPossible) underHeaderKey.push(source)
    else standalone.push(source)
  }
  return [...standalone, ...underHeaderKey]
}

export function headerKeyOf(source: DataSource): string {
  if (!sourceKind(source.kind).headerKeyPossible) return ''
  return (source.headerKeyIndex ?? '').trim()
}

export function varFromHeaderKeys(
  sources: readonly DataSource[],
): { ID: string; FELDER: string }[] {
  const perId = new Map<string, string[]>()
  for (const s of sources) {
    const headerKey = headerKeyOf(s)
    if (headerKey === '') continue

    const parts = /^([A-Za-z][A-Za-z0-9]*)_(\d+_\d+)$/.exec(headerKey)
    if (!parts) continue
    const fields = perId.get(parts[1]) ?? []
    if (!fields.includes(parts[2])) fields.push(parts[2])
    perId.set(parts[1], fields)
  }
  return [...perId].map(([ID, fields]) => ({ ID, FELDER: fields.join(',') }))
}

export function checkDataSources(
  raw: unknown,
): { list: DataSource[]; problems: EntryProblem[] } {
  const problems: EntryProblem[] = []
  if (!Array.isArray(raw)) return { list: [], problems }
  const acc: DataSource[] = []
  const seen = new Set<string>()
  let nr = 0
  for (const entry of raw) {
    nr++

    const spot = entry && typeof entry === 'object'
      && typeof (entry as Record<string, unknown>).id === 'string'
      && (entry as Record<string, unknown>).id !== ''
      ? (entry as Record<string, unknown>).id as string
      : `Eintrag ${nr}`
    const away = (base: string): void => { problems.push({ spot, base }) }
    if (!entry || typeof entry !== 'object') {
      away('die Datenquelle ist unlesbar')
      continue
    }
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id === '') {
      away('der Datenquelle fehlt ihre Kennung')
      continue
    }
    if (seen.has(e.id)) {
      away('diese Kennung kommt zweimal vor')
      continue
    }

    if (e.id.includes(SOURCES_DIVIDER)) {
      away(`die Kennung enthält „${SOURCES_DIVIDER}" und wäre damit mehrdeutig`)
      continue
    }
    if (typeof e.name !== 'string' || e.name.trim() === '') {
      away('der Klarname fehlt')
      continue
    }
    if (typeof e.kind !== 'string' || !SOURCE_KIND_IDS.includes(e.kind as SourceKindId)) {
      away('die Art der Datenquelle fehlt oder ist unbekannt')
      continue
    }

    if (tableKeyNeeded(sourceKind(e.kind as SourceKindId))
      && (typeof e.idbId !== 'string' || e.idbId.trim() === '')) {
      away('die Tabellen-Kennung fehlt (z. B. IDB0001)')
      continue
    }

    if (sourceKind(e.kind as SourceKindId).areaNeeded
      && (typeof e.area !== 'string' || e.area.trim() === '')) {
      away('der Bereich der ERP-Maske fehlt (z. B. BEL)')
      continue
    }
    const fields: DataField[] = []
    let fieldNr = 0
    for (const f of Array.isArray(e.fields) ? e.fields : []) {
      fieldNr++
      const fieldAway = (base: string): void => {
        problems.push({ spot: `${spot} · Feld ${fieldNr}`, base })
      }
      if (!f || typeof f !== 'object') {
        fieldAway('das Feld ist unlesbar')
        continue
      }
      const ff = f as Record<string, unknown>
      if (typeof ff.code !== 'string' || ff.code === '') {
        fieldAway('dem Feld fehlt sein Feldcode')
        continue
      }

      if (ff.code.includes(SOURCES_DIVIDER)) {
        fieldAway(`der Feldcode enthält „${SOURCES_DIVIDER}" und wäre damit mehrdeutig`)
        continue
      }
      if (typeof ff.name !== 'string' || ff.name === '') {
        fieldAway('dem Feld fehlt sein Klarname')
        continue
      }

      const icon = typeof ff.icon === 'number' && Number.isFinite(ff.icon)
        && ff.icon >= 1
        ? Math.min(ICON_MAX, Math.round(ff.icon))
        : undefined
      fields.push({
        code: ff.code,
        name: ff.name,
        ...(icon === undefined ? {} : { icon }),
      })
    }

    const loadRelation = e.loadRelation === undefined ? null : checkLoadRelation(e.loadRelation)
    if (e.loadRelation !== undefined && loadRelation === null) {
      problems.push({ spot, base: 'die Hol-Relation ist unvollständig und wurde verworfen' })
    }
    const getValue = e.getValue === undefined ? null : checkGetValue(e.getValue)
    if (e.getValue !== undefined && getValue === null) {
      problems.push({ spot, base: 'die Wert-Relation ist unvollständig und wurde verworfen' })
    }
    seen.add(e.id)
    acc.push({
      id: e.id,
      name: e.name,
      kind: e.kind as SourceKindId,
      ...(typeof e.idbId === 'string' && e.idbId !== '' ? { idbId: e.idbId } : {}),
      ...(typeof e.recordField === 'string' && e.recordField !== '' ? { recordField: e.recordField } : {}),
      ...(typeof e.headerKeyIndex === 'string' && e.headerKeyIndex !== ''
        ? { headerKeyIndex: e.headerKeyIndex }
        : {}),
      ...(e.delivery === 'openRecord' ? { delivery: 'openRecord' as const } : {}),
      ...(typeof e.fieldPrefix === 'string' && e.fieldPrefix !== ''
        ? { fieldPrefix: e.fieldPrefix }
        : {}),
      ...(typeof e.area === 'string' && e.area.trim() !== ''
        ? { area: e.area.trim().toUpperCase() }
        : {}),
      ...(loadRelation ? { loadRelation } : {}),
      ...(getValue ? { getValue } : {}),
      fields: fields,
    })
  }
  return { list: acc, problems }
}
