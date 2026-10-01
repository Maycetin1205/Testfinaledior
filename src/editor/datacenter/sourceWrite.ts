import { aliasOf, type DataField } from '../../core/data/dataSources'
import { sourcePreset, type PresetId } from '../../core/data/presets/presets'
import type { Write } from '../../core/data/writes/writes'

// Positions hang under the document's header record, as SoftEngine lists them.
export const POSITIONS_UNDER = 'BEL_0_11'

// The record number is the field named so; a source that knows one keeps it.
export function writeFor(preset: PresetId, fields: readonly DataField[], before: Write): Write {
  if (!sourcePreset(preset).writes) return { kind: 'none' }
  const named = fields.find((f) => aliasOf(f.name) === 'satznummer')
  if (named) return { kind: 'putRelation', recordField: named.code }
  if (before.kind === 'putRelation' && fields.some((f) => f.code === before.recordField)) return before
  return before.kind === 'putRelation' && fields.length === 0 ? before : { kind: 'none' }
}
