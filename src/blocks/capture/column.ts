import { splitBinding } from '../../core/block/blockType'
import {
  listForExport,
  withEntryValue,
  type EntryFieldChoice,
  type EntryPlaceChoice,
  type EntrySwitch,
  type ListBinding,
} from '../../core/block/listBinding'
import { structuredProperty, type Property } from '../../core/block/property'
import { isUnread } from '../../core/unread'
import { coerceColumns, COLUMNS_BINDING, defaultColumns, type Column } from '../list/columns'

export type CaptureColumn = Column & {
  editable?: boolean

  required?: boolean

  // The column stands in the grey second line of the row, in the cell of
  // the column named by its key; without one, under the nearest column to
  // its left.
  subline?: boolean
  under?: string

  fillField?: string

  windowColumns?: Column[]

  windowWidth?: number

  windowHeight?: number
}

function capturePart(raw: unknown): Partial<CaptureColumn> {
  if (!isUnread<CaptureColumn>(raw)) return {}
  const { editable, required, subline, under, fillField, windowColumns, windowWidth, windowHeight } = raw
  return {
    ...(typeof editable === 'boolean' ? { editable } : {}),

    ...(typeof required === 'boolean' ? { required } : {}),

    ...(typeof subline === 'boolean' ? { subline } : {}),

    ...(typeof under === 'string' && under.trim() !== '' ? { under: under.trim() } : {}),

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

const SUBLINE: EntrySwitch<CaptureColumn> = {
  key: 'subline',
  name: 'In der Unterzeile',
  short: 'Unterzeile',
  valueOf: (column) => column.subline,
  // Off takes the anchor along.
  withValue: (column, on) => withEntryValue(
    withEntryValue(column, 'subline', on),
    'under',
    on === true ? column.under : undefined,
  ),
}

// The key of the column a subline column stands under: the chosen one when
// it is a column of the row, else the nearest row column to its left, else
// the first. Empty when the row has no column.
export function anchorKeyOf(columns: readonly CaptureColumn[], index: number): string {
  const own = columns[index]
  if (own === undefined || own.subline !== true) return ''
  const inRow = (c: CaptureColumn): boolean => c.subline !== true
  const chosen = columns.find((c) => inRow(c) && c.key === own.under)
  if (chosen) return chosen.key
  const left = columns.slice(0, index).reverse().find(inRow)
  return (left ?? columns.find(inRow))?.key ?? ''
}

const UNDER: EntryPlaceChoice<CaptureColumn> = {
  key: 'under',
  name: 'Unter',
  shown: (column) => column.subline === true,
  options: (columns) => columns
    .filter((c) => c.subline !== true)
    .map((c) => ({ value: c.key, name: c.title })),
  valueOf: (columns, index) => anchorKeyOf(columns, index),
  withValue: (column, value) => withEntryValue(column, 'under', value === '' ? undefined : value),
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
    .flatMap((s): EntrySwitch<CaptureColumn>[] => (s.key === 'total' ? [s, EDITABLE, REQUIRED, SUBLINE] : [s])),

  entryFieldChoice: [FILL_FIELD],

  entryPlace: [UNDER],
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
