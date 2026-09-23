import {
  fieldCode,
  columnsNameFromInput,
  LENGTH_MAX,
  type DataField,
} from '../../core/data/dataSources'

import { fieldCodeSplit } from '../../core/data/relations'

export interface FieldRow {
  label: string
  pos: string
  len: string
  rawCode: string

  length: string
}

export const EMPTY_ROW: FieldRow = {
  label: '', pos: '', len: '', rawCode: '', length: '',
}

export function rowFromField(
  f: DataField, prefix = '', columnsNames = false,
): FieldRow {
  const length = f.length === undefined ? '' : String(f.length)
  if (columnsNames) return { label: f.name, pos: '', len: '', rawCode: f.code, length }
  const withoutPrefix = prefix !== '' && f.code.startsWith(prefix)
    ? f.code.slice(prefix.length)
    : f.code
  const pl = fieldCodeSplit(withoutPrefix)
  return {
    label: f.name,
    pos: pl?.pos ?? '',
    len: pl?.len ?? '',
    rawCode: pl ? '' : f.code,
    length,
  }
}

export function rowsCode(z: FieldRow, prefix = '', columnsNames = false): string {
  if (columnsNames) return columnsNameFromInput(z.rawCode)
  if (z.pos.trim() === '' && z.len.trim() === '' && z.rawCode !== '') return z.rawCode
  return fieldCode(z.pos, z.len, prefix)
}

export function rowsLength(z: FieldRow): number | undefined {
  const raw = Number(z.length.trim())
  if (z.length.trim() === '' || !Number.isFinite(raw) || raw < 1) return undefined
  return Math.min(LENGTH_MAX, Math.round(raw))
}
