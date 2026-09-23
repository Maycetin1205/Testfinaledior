import { Boxes, Database, FileText, Users } from '@/editor/icons/icon'
import type { BlockNode } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import type { ChoiceOption } from '../../core/block/property'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { selectionSourceIdOf } from '../../core/block/treeQuery'
import type { DataSource, DataField, SourceKindId } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'

const KIND_ICONS: Partial<Record<SourceKindId, typeof Database>> = {
  idb: Database,
  addressMaster: Users,
  itemMaster: Boxes,
  document: FileText,
}

export function ikonFor(kind: SourceKindId): typeof Database {
  return KIND_ICONS[kind] ?? Database
}

export const VERB_SHORT: Record<RelationTemplate['verb'], string> = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
  PUTADD_RELATION: 'PUTADD',
}

export const RELATION_GROUPS: ChoiceOption[] = [
  { value: 'read', name: 'Lesen' },
  { value: 'write', name: 'Schreiben' },
]

export const PLACEHOLDER_PLAIN_TEXT: Record<string, { name: string }> = {
  FELD_POS: { name: 'Position' },
  FELD_LEN: { name: 'Länge' },
  PINDEX: { name: 'Satznummer' },
  SELKEY: { name: 'Schlüssel' },
  DROP_PINDEX: { name: 'Satznummer der Löschung' },
  RELID: { name: 'Tabelle' },
  VALUE: { name: 'Wert' },

  NOW_DATE: { name: 'Heutiges Datum' },
}

export function placeholderName(raw: string): string {
  const name = /^\{([A-Za-z0-9_]+)\}$/.exec(raw.trim())?.[1]
  return name === undefined ? '' : PLACEHOLDER_PLAIN_TEXT[name]?.name ?? name
}

export interface BlockValueOption {
  key: string
  blockId: string
  prop: string
  label: string
}

export function blockValueKey(blockId: string, prop: string): string {
  return `${encodeURIComponent(blockId)}:${encodeURIComponent(prop)}`
}

export interface SelectionGiverOption {
  blockId: string
  label: string
  fields: readonly DataField[]
}

export interface CaptureOption {
  blockId: string
  label: string

  columns: readonly { key: string; title: string }[]
}

export function captureOptions(
  carrier: readonly BlockNode[],
  sources: readonly DataSource[],
): CaptureOption[] {
  return carrier.map((node) => {
    const binding = capability(blockType(node.type), 'list')?.binding
    const keyKey = binding?.keyProperty
    const raw = binding ? node.values[binding.prop] : undefined
    const columns = binding && keyKey !== undefined && Array.isArray(raw)
      ? raw.flatMap((entry) => {
          const e = entry as Record<string, unknown>
          const key = e[keyKey]
          if (typeof key !== 'string' || key === '') return []
          const title = e[binding.titleKey]
          return [{
            key,
            title: typeof title === 'string' && title !== '' ? title : binding.standardTitle,
          }]
        })
      : []
    return { blockId: node.id, label: blockName(node, sources), columns }
  })
}

export function selectionGiverOptions(
  giver: readonly BlockNode[],
  sources: readonly DataSource[],
): SelectionGiverOption[] {
  return giver.map((node) => {
    const source = sources.find((s) => s.id === selectionSourceIdOf(node))
    return {
      blockId: node.id,
      label: source
        ? `${blockName(node, sources)} (${source.name})`
        : blockName(node, sources),
      fields: source?.fields ?? [],
    }
  })
}
