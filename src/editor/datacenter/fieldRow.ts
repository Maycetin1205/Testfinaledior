import {
  fieldCode,
  columnsNameFromInput,
  ICON_MAX,
  type DataField,
} from '../../core/data/dataSources'

import { fieldCodeSplit } from '../../core/data/relations'

export interface FieldRow {
  label: string
  pos: string
  len: string
  rawCode: string

  icon: string
}

export const EMPTY_ROW: FieldRow = {
  label: '', pos: '', len: '', rawCode: '', icon: '',
}

export function rowFromField(
  f: DataField, prefix = '', columnsNames = false,
): FieldRow {
  const icon = f.icon === undefined ? '' : String(f.icon)
  if (columnsNames) return { label: f.name, pos: '', len: '', rawCode: f.code, icon }
  const withoutPrefix = prefix !== '' && f.code.startsWith(prefix)
    ? f.code.slice(prefix.length)
    : f.code
  const pl = fieldCodeSplit(withoutPrefix)
  return {
    label: f.name,
    pos: pl?.pos ?? '',
    len: pl?.len ?? '',
    rawCode: pl ? '' : f.code,
    icon,
  }
}

export function rowsCode(z: FieldRow, prefix = '', columnsNames = false): string {
  if (columnsNames) return columnsNameFromInput(z.rawCode)
  if (z.pos.trim() === '' && z.len.trim() === '' && z.rawCode !== '') return z.rawCode
  return fieldCode(z.pos, z.len, prefix)
}

export function rowsIcon(z: FieldRow): number | undefined {
  const raw = Number(z.icon.trim())
  if (z.icon.trim() === '' || !Number.isFinite(raw) || raw < 1) return undefined
  return Math.min(ICON_MAX, Math.round(raw))
}
