import type { EntrySwitch, ListBinding } from '../../core/block/blockType'
import { flagOn, flagFor } from '../../core/block/listBinding'
import { coerceColumns, COLUMNS_BINDING, standardColumns, type Column } from './columns'
import { structuredProperty, type Property } from '../../core/block/property'

export type CaptureColumn = Column & {
  editable?: boolean

  fillField?: string

  windowColumns?: Column[]
}

function capturePart(x: unknown): Partial<CaptureColumn> {
  if (!x || typeof x !== 'object') return {}
  const o = x as Record<string, unknown>
  return {
    ...(typeof o.editable === 'boolean' ? { editable: o.editable } : {}),

    ...(typeof o.fillField === 'string' && o.fillField.trim() !== ''
      ? { fillField: o.fillField.trim() }
      : {}),

    ...(Array.isArray(o.windowColumns) && o.windowColumns.length > 0
      ? { windowColumns: coerceColumns(o.windowColumns) }
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
      hint: 'Beim Erfassen füllt der gewählte Satz der Hilfsquelle diese Zelle.',
      onlyForeignSources: true,
    },
  ],
}

export function columnEditable(column: Column): boolean {
  const entry = column as unknown as Record<string, unknown>
  return column.field !== ''
    && flagFor(CAPTURE_COLUMNS_BINDING, entry).includes(EDITABLE)
    && flagOn(EDITABLE, entry)
}

export function captureColumnsProperty(): Property<CaptureColumn[]> {
  return structuredProperty<CaptureColumn[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: coerceCaptureColumns(raw) }
      : { ok: false, reason: 'Spaltenliste erwartet' }),
    toAttribute: (value) => JSON.stringify(value),
    fromAttribute: (raw) => (raw === null ? standardColumns() : tryCoerceCaptureColumns(raw)),
  }, {
    default: standardColumns(),
    label: 'Spalten',
    help: 'Welche Felder in welcher Reihenfolge erfasst werden.',
    place: 'block',
    attribute: 'columns',
  })
}
