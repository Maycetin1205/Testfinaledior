import { splitBinding } from '../../core/block/blockType'
import {
  listForExport,
  withEntryValue,
  type EntryFieldChoice,
  type EntryPlaceChoice,
  type EntrySwitch,
  type ListBinding,
} from '../../core/block/listBinding'
import { listProperty, type Property } from '../../core/block/property'
import { isUnread } from '../../core/unread'
import { coerceColumns, COLUMNS_BINDING, defaultColumns, type Column } from '../list/columns'

export type CaptureColumn = Column & {
  editable?: boolean

  required?: boolean

  // The column stands in the grey line of the row, under the cell of the
  // column its key names.
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

// Under which cell of the row each column of the grey line stands, by place
// among all columns: one under a cell, as wide as the cell. A column stands
// under the column its key names; one without that choice, or whose choice
// is taken, takes the first free cell from the left. Where no cell is free,
// it stays in the row.
export function greyLine(columns: readonly CaptureColumn[], shown: readonly number[]): Map<number, number> {
  const row = shown.filter((slot) => columns[slot]?.subline !== true)
  const under = new Map<number, number>()
  const unplaced: number[] = []
  for (const slot of shown) {
    if (columns[slot]?.subline !== true) continue
    const chosen = row.find((r) => columns[r].key === columns[slot].under)
    if (chosen !== undefined && !under.has(chosen)) under.set(chosen, slot)
    else unplaced.push(slot)
  }
  for (const slot of unplaced) {
    const free = row.find((r) => !under.has(r))
    if (free === undefined) break
    under.set(free, slot)
  }
  return under
}

// The columns with the one at index placed under the column with that key.
// A column already standing there takes the cell this one leaves.
function placedUnder(columns: readonly CaptureColumn[], index: number, key: string): CaptureColumn[] | null {
  const target = columns.findIndex((c) => c.key === key && c.subline !== true)
  if (columns[index]?.subline !== true || target === -1) return null
  const under = greyLine(columns, columns.map((_, i) => i))
  const left = [...under].find(([, slot]) => slot === index)?.[0]
  const there = under.get(target)
  if (there === index) return null
  return columns.map((column, i) => {
    if (i === index) return withEntryValue(column, 'under', key)
    if (i === there) return withEntryValue(column, 'under', left === undefined ? undefined : columns[left].key)
    return column
  })
}

const UNDER: EntryPlaceChoice<CaptureColumn> = {
  shown: (column) => column.subline === true,
  placed: placedUnder,
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

  entryPlace: UNDER,
}

// A field of a helper source is looked up, never typed: the switch does not
// even show for such a column.
export function columnEditable(column: CaptureColumn): boolean {
  if (column.field === '') return false
  if (splitBinding(column.field).sourceId !== '') return false
  return column.editable ?? EDITABLE.onByDefault === true
}

export function captureColumnsProperty(): Property<CaptureColumn[]> {
  return listProperty<CaptureColumn[]>(coerceCaptureColumns, {
    default: defaultColumns(),
    label: 'Spalten',
    place: 'block',
    attribute: 'columns',
  }, (value) => listForExport(value, CAPTURE_COLUMNS_BINDING))
}
