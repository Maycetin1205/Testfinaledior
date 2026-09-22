import type { Parameter } from '../../core/data/actions'
import { relationParameterDefault } from '../../core/data/actions'
import { tableIdOf, type DataSource } from '../../core/data/dataSources'
import {
  relIdFromIdbId,
  fieldCodeSplit,
  type RelationTemplate,
} from '../../core/data/relations'

export interface AdoptField {
  sourceId: string
  sourceName: string
  code: string
  label: string

  posLen: string
}

export interface AdoptSource {
  sourceId: string
  sourceName: string
}

export interface AdoptHit {
  kind: 'pos' | 'len' | 'relid'
  value: string
}

export interface FieldAdoptResult {
  params: Parameter[]
  set: AdoptHit[]
}

export type FieldAdoptParameterKind = 'pos' | 'len' | 'relid'
export type FieldAdoptTarget = 'field' | 'idb'

export function fieldAdoptKind(raw: string): FieldAdoptParameterKind | null {
  const match = /^(?:([A-Za-z_]+)|\{([A-Za-z_]+)\})$/.exec(raw)
  const name = (match?.[1] ?? match?.[2])?.toUpperCase()
  if (name === 'POS' || name === 'FELD_POS') return 'pos'
  if (name === 'LEN' || name === 'FELD_LEN') return 'len'
  if (name === 'IDBID' || name === 'RELID') return 'relid'
  return null
}

function fieldPosLen(
  source: DataSource,
  code: string,
): { pos: string; len: string } | null {
  const prefix = source.fieldPrefix ?? ''
  const without = prefix !== '' && code.startsWith(prefix) ? code.slice(prefix.length) : code
  return fieldCodeSplit(without)
}

export function adoptFields(
  dataSources: readonly DataSource[],
): AdoptField[] {
  const fields: AdoptField[] = []
  for (const source of dataSources) {
    for (const field of source.fields) {
      const pl = fieldPosLen(source, field.code)
      if (!pl) continue
      fields.push({
        sourceId: source.id,
        sourceName: source.name,
        code: field.code,
        label: field.name,
        posLen: `${pl.pos}_${pl.len}`,
      })
    }
  }
  return fields
}

export function adoptTables(
  dataSources: readonly DataSource[],
): AdoptSource[] {
  return dataSources
    .filter((source) => tableIdOf(source) !== '')
    .map((source) => ({ sourceId: source.id, sourceName: source.name }))
}

export function fieldAdopt(
  params: readonly Parameter[],
  relation: RelationTemplate,
  source: DataSource,
  code: string,
  target: FieldAdoptTarget,
): FieldAdoptResult {
  const defaults = relationParameterDefault(relation)
  const next = relation.parameter.map((_, index) => ({
    ...(params[index] ?? defaults[index]),
  }))
  const set: AdoptHit[] = []

  relation.parameter.forEach((param, index) => {
    const kind = fieldAdoptKind(param)
    if (target === 'idb' && kind === 'relid') {
      const relId = relIdFromIdbId(tableIdOf(source))
      next[index] = { source: 'fixed', value: relId }
      set.push({ kind, value: relId })
      return
    }
    if (target !== 'field') return
    const posLen = fieldPosLen(source, code)
    if (!posLen) return
    if (kind === 'pos') {
      next[index] = { source: 'fixed', value: posLen.pos }
      set.push({ kind, value: posLen.pos })
    } else if (kind === 'len') {
      next[index] = { source: 'fixed', value: posLen.len }
      set.push({ kind, value: posLen.len })
    }
  })

  return { params: next, set }
}
