import type { EntrySwitch, ListBinding } from '../../core/block/blockType'
import { splitBinding } from '../../core/block/blockType'
import { listForExport } from '../../core/block/listBinding'
import { coerceColumns, COLUMNS_BINDING, standardColumns, type Column } from '../behavior/columns'
import {
  isPropertyEntry,
  structuredProperty,
  type Property,
} from '../../core/block/property'
import { reportError } from '../../softengine/report'

const UNREADABLE = 'Die Spaltenliste dieser Erfassung ist unlesbar; sie zeigt eine leere Spalte.'

export type CaptureColumn = Column & {
  editable?: boolean

  fillField?: string

  windowColumns?: Column[]
}

function capturePart(raw: unknown): Partial<CaptureColumn> {
  if (!isPropertyEntry(raw)) return {}
  const { editable, fillField, windowColumns } = raw
  return {
    ...(typeof editable === 'boolean' ? { editable } : {}),

    ...(typeof fillField === 'string' && fillField.trim() !== ''
      ? { fillField: fillField.trim() }
      : {}),

    ...(Array.isArray(windowColumns) && windowColumns.length > 0
      ? { windowColumns: coerceColumns(windowColumns) }
      : {}),
  }
}

export function coerceCaptureColumns(v: unknown): CaptureColumn[] {
  const raw = Array.isArray(v) ? v : []
  return coerceColumns(v).map((column, i) => ({ ...column, ...capturePart(raw[i]) }))
}

export function tryCoerceCaptureColumns(v: string): CaptureColumn[] {
  try {
    return coerceCaptureColumns(JSON.parse(v))
  } catch {
    reportError(UNREADABLE)
    return standardColumns()
  }
}

const EDITABLE: EntrySwitch = {
  key: 'editable',
  name: 'In der Zeile änderbar',
  short: 'änderbar',
  standard: true,
  onlyOwnSource: true,
}

export const CAPTURE_COLUMNS_BINDING: ListBinding = {
  ...COLUMNS_BINDING,

  entryFlag: (COLUMNS_BINDING.entryFlag ?? [])
    .flatMap((s) => (s.key === 'total' ? [s, EDITABLE] : [s])),

  entryFieldChoice: [
    {
      key: 'fillField',

      name: 'Nachschlagen',
      onlyForeignSources: true,
    },
  ],
}

// A field of a helper source is looked up, never typed: the switch does not
// even show for such a column.
export function columnEditable(column: CaptureColumn): boolean {
  if (column.field === '') return false
  if (splitBinding(column.field).sourceId !== '') return false
  return column.editable ?? EDITABLE.standard === true
}

export function captureColumnsProperty(): Property<CaptureColumn[]> {
  return structuredProperty<CaptureColumn[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: coerceCaptureColumns(raw) }
      : { ok: false }),
    toAttribute: (value) => JSON.stringify(listForExport(value, CAPTURE_COLUMNS_BINDING)),
    fromAttribute: (raw) => (raw === null ? standardColumns() : tryCoerceCaptureColumns(raw)),
  }, {
    default: standardColumns(),
    label: 'Spalten',
    place: 'block',
    attribute: 'columns',
  })
}
