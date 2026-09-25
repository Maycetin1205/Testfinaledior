import { splitBinding } from '../../core/block/blockType'
import {
  listForExport,
  withEntryValue,
  type EntryFieldChoice,
  type EntrySwitch,
  type ListBinding,
} from '../../core/block/listBinding'
import { structuredProperty, type Property } from '../../core/block/property'
import { isUnread } from '../../core/unread'
import { coerceColumns, COLUMNS_BINDING, defaultColumns, type Column } from '../list/columns'

export type CaptureColumn = Column & {
  editable?: boolean

  required?: boolean

  fillField?: string

  windowColumns?: Column[]

  windowWidth?: number

  windowHeight?: number
}

function capturePart(raw: unknown): Partial<CaptureColumn> {
  if (!isUnread<CaptureColumn>(raw)) return {}
  const { editable, required, fillField, windowColumns, windowWidth, windowHeight } = raw
  return {
    ...(typeof editable === 'boolean' ? { editable } : {}),

    ...(typeof required === 'boolean' ? { required } : {}),

    ...(typeof fillField === 'string' && fillField.trim() !== ''
      ? { fillField: fillField.trim() }
      : {}),

    ...(Array.isArray(windowColumns) && windowColumns.length > 0
      ? { windowColumns: coerceColumns(windowColumns) }
      : {}),

    ...(typeof windowWidth === 'number' ? { windowWidth } : {}),

    ...(typeof windowHeight === 'number' ? { windowHeight } : {}),
  }
}

export function coerceCaptureColumns(v: unknown): CaptureColumn[] {
  const raw = Array.isArray(v) ? v : []
  return coerceColumns(v).map((column, i) => ({ ...column, ...capturePart(raw[i]) }))
}

function tryCoerceCaptureColumns(v: string): CaptureColumn[] {
  try {
    return coerceCaptureColumns(JSON.parse(v))
  } catch {
    return defaultColumns()
  }
}

const EDITABLE: EntrySwitch<CaptureColumn> = {
  key: 'editable',
  name: 'In der Zeile änderbar',
  short: 'Eingabe erlaubt',
  onByDefault: true,
  onlyOwnSource: true,
  valueOf: (column) => column.editable,
  withValue: (column, on) => withEntryValue(column, 'editable', on),
}

// A row without a value in this column is not captured.
const REQUIRED: EntrySwitch<CaptureColumn> = {
  key: 'required',
  name: 'Pflicht',
  valueOf: (column) => column.required,
  withValue: (column, on) => withEntryValue(column, 'required', on),
}

const FILL_FIELD: EntryFieldChoice<CaptureColumn> = {
  key: 'fillField',
  name: 'Füllfeld',
  onlyForeignSources: true,
  valueOf: (column) => column.fillField ?? '',
  withValue: (column, field) => withEntryValue(column, 'fillField', field === '' ? undefined : field),
}

export const CAPTURE_COLUMNS_BINDING: ListBinding<CaptureColumn> = {
  ...COLUMNS_BINDING,
  entries: coerceCaptureColumns,

  entryFlag: (COLUMNS_BINDING.entryFlag ?? [])
    .flatMap((s): EntrySwitch<CaptureColumn>[] => (s.key === 'total' ? [s, EDITABLE, REQUIRED] : [s])),

  entryFieldChoice: [FILL_FIELD],
}

// A field of a helper source is looked up, never typed: the switch does not
// even show for such a column.
export function columnEditable(column: CaptureColumn): boolean {
  if (column.field === '') return false
  if (splitBinding(column.field).sourceId !== '') return false
  return column.editable ?? EDITABLE.onByDefault === true
}

export function captureColumnsProperty(): Property<CaptureColumn[]> {
  return structuredProperty<CaptureColumn[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: coerceCaptureColumns(raw) }
      : { ok: false }),
    toAttribute: (value) => JSON.stringify(listForExport(value, CAPTURE_COLUMNS_BINDING)),
    fromAttribute: (raw) => (raw === null ? defaultColumns() : tryCoerceCaptureColumns(raw)),
  }, {
    default: defaultColumns(),
    label: 'Spalten',
    place: 'block',
    attribute: 'columns',
  })
}
