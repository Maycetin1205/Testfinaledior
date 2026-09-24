import type { SourcePreset } from './sourcePreset'
import { idb } from './idb'
import { addressMaster } from './addressMaster'
import { itemMaster } from './itemMaster'
import { document } from './document'
import { documentItem } from './documentItem'
import { file } from './file'
import { erpQuery } from './erpQuery'
import { dataset } from './dataset'
import { relationValue } from './relationValue'
import { erpMask } from './erpMask'

export type PresetId =
  | 'idb'
  | 'addressMaster'
  | 'itemMaster'
  | 'document'
  | 'documentItem'
  | 'file'
  | 'erpQuery'
  | 'dataset'
  | 'relationValue'
  | 'erpMask'

const PRESETS: { [P in PresetId]: SourcePreset<P> } = {
  idb,
  addressMaster,
  itemMaster,
  document,
  documentItem,
  file,
  erpQuery,
  dataset,
  relationValue,
  erpMask,
}

export const PRESET_IDS: readonly PresetId[] = Object.values(PRESETS).map((p) => p.id)

export function sourcePreset(id: PresetId): SourcePreset<PresetId> {
  return PRESETS[id]
}

export function isPresetId(id: unknown): id is PresetId {
  return typeof id === 'string' && (PRESET_IDS as readonly string[]).includes(id)
}
