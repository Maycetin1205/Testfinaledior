import { SOURCES_DIVIDER, splitBinding } from '../block/blockType'
import { getValueOf, checkGetValue, type GetValue } from './getValue'
import { loadRelationOf, POS_LEN, checkLoadRelation, type LoadRelation } from './fetchRelation'
import {
  sourceKind,
  SOURCE_KIND_IDS,
  SOURCE_KINDS,
  tableKeyNeeded,
  type SourceKindId,
} from './sourceKinds'

export { sourceKind, SOURCE_KINDS, tableKeyNeeded, type SourceKindId }
export {
  getValueOf,
  GET_VALUE_SOURCES,
  getValueSourceAllowed,
  sourcesFromGetValue,
} from './getValue'
export {
  fieldsBehindCut,
  loadRelationOf,
  relationNrFromInput,
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
  const taken = new Set<string>()
  return sources.map((s) => {
    let name = s.name
    for (let n = 2; taken.has(aliasOf(name)); n++) name = `${s.name.trim()} ${n}`
    taken.add(aliasOf(name))
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

export function checkDataSources(raw: unknown): DataSource[] {
  if (!Array.isArray(raw)) return []
  const acc: DataSource[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id === '') continue
    if (seen.has(e.id)) continue
    if (e.id.includes(SOURCES_DIVIDER)) continue
    if (typeof e.name !== 'string' || e.name.trim() === '') continue
    if (typeof e.kind !== 'string' || !SOURCE_KIND_IDS.includes(e.kind as SourceKindId)) continue
    if (tableKeyNeeded(sourceKind(e.kind as SourceKindId))
      && (typeof e.idbId !== 'string' || e.idbId.trim() === '')) continue
    if (sourceKind(e.kind as SourceKindId).areaNeeded
      && (typeof e.area !== 'string' || e.area.trim() === '')) continue
    const fields: DataField[] = []
    for (const f of Array.isArray(e.fields) ? e.fields : []) {
      if (!f || typeof f !== 'object') continue
      const ff = f as Record<string, unknown>
      if (typeof ff.code !== 'string' || ff.code === '') continue
      if (ff.code.includes(SOURCES_DIVIDER)) continue
      if (typeof ff.name !== 'string' || ff.name === '') continue

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
    const getValue = e.getValue === undefined ? null : checkGetValue(e.getValue)
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
  return acc
}
