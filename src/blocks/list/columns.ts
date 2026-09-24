import {
  assignKeys,
  listForExport,
  withEntryValue,
  type EntrySwitch,
  type ListBinding,
} from '../../core/block/listBinding'
import { structuredProperty, type Property } from '../../core/block/property'
import { isUnread } from '../../core/unread'

export type Column = {
  key: string
  title: string
  field: string

  width?: number

  total?: boolean

  hidden?: boolean

  // The builder typed the title; a picked field leaves it alone.
  titleTyped?: boolean
}

export interface ColumnView {
  columns: readonly Column[]
  slots: readonly number[]
}

export function columnsView(
  columns: readonly Column[],
  showAll: boolean,
  awayByOperator: ReadonlySet<string> = new Set(),
): ColumnView {
  const away = (s: Column): boolean => s.hidden === true || awayByOperator.has(s.key)
  if (showAll || !columns.some(away)) {
    return { columns, slots: columns.map((_, i) => i) }
  }
  const shown: Column[] = []
  const slots: number[] = []
  columns.forEach((s, i) => {
    if (away(s)) return
    shown.push(s)
    slots.push(i)
  })
  if (shown.length === 0 && columns.length > 0) return { columns: [columns[0]], slots: [0] }
  return { columns: shown, slots }
}

export const CELL_PLACEHOLDER = '—'

export const FIELD_KEY_PREFIX = 'field:'

const COLUMNS_MIN = 1

export const COLUMNS_MAX = 16

export const COLUMNS_MIN_WIDTH = 40

export const DEFAULT_TITLE = 'Spalte {n}'

function defaultTitleFor(index: number): string {
  return DEFAULT_TITLE.replace('{n}', String(index + 1))
}

export function newColumn(index: number): Column {
  return { key: '', title: defaultTitleFor(index), field: '' }
}

export function columnWithKey(columns: readonly Column[], key: string): number {
  const t = key.trim()
  if (t === '') return -1
  return columns.findIndex((s) => s.key === t)
}

function withKeys(columns: readonly Column[]): Column[] {
  const keys = assignKeys(columns.map((s) => s.key))
  return columns.map((s, i) => (s.key === keys[i] ? s : { ...s, key: keys[i] }))
}

export function defaultColumns(): Column[] {
  return withKeys([newColumn(0)])
}

function asWidth(v: unknown): number | undefined {
  const number = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(number)) return undefined
  const rounded = Math.round(number)
  return rounded < COLUMNS_MIN_WIDTH ? COLUMNS_MIN_WIDTH : rounded
}

const KNOWN_FACTS: readonly string[] = ['key', 'title', 'field', 'width', 'total', 'hidden', 'titleTyped']

// A column entry may carry facts of the block that declared it: the capture
// keeps its own per column. They travel through untouched.
function extraFacts(entry: object): object {
  return Object.fromEntries(Object.entries(entry)
    .filter(([key, value]) => value !== undefined && !KNOWN_FACTS.includes(key)))
}

function asColumn(raw: unknown, index: number): Column {
  if (isUnread<Column>(raw)) {
    const width = raw.width === undefined ? undefined : asWidth(raw.width)
    const column: Column = {
      key: typeof raw.key === 'string' ? raw.key.trim() : '',
      title: typeof raw.title === 'string' ? raw.title : defaultTitleFor(index),
      field: typeof raw.field === 'string' ? raw.field : '',

      ...(width === undefined ? {} : { width }),

      ...(typeof raw.total === 'boolean' ? { total: raw.total } : {}),

      ...(typeof raw.hidden === 'boolean' ? { hidden: raw.hidden } : {}),

      ...(raw.titleTyped === true ? { titleTyped: true } : {}),
    }

    return Object.assign(extraFacts(raw), column)
  }

  if (typeof raw === 'string') return { ...newColumn(index), title: raw }
  return newColumn(index)
}

export function coerceColumns(v: unknown): Column[] {
  let arr: Column[]
  if (Array.isArray(v)) {
    arr = v.map((x, i) => asColumn(x, i))
  } else if ((typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && /^\d+$/.test(v))) {
    const n = Math.max(1, Math.floor(Number(v)))
    arr = [...Array(n).keys()].map((i) => newColumn(i))
  } else {
    arr = defaultColumns()
  }

  if (arr.length < COLUMNS_MIN) arr = [newColumn(0)]
  return withKeys(arr)
}

function tryCoerceColumns(v: string): Column[] {
  try {
    return coerceColumns(JSON.parse(v))
  } catch {
    return defaultColumns()
  }
}

// The css grid template the head, the rows and the ruler all stand on.
export type ColumnsGrid = { gridTemplateColumns: string }

// The editor owns the tree; a block asks it to store changed columns.
export function sendColumnsChange(el: HTMLElement, columns: readonly Column[]): void {
  el.dispatchEvent(new CustomEvent('ff-prop-change', {
    detail: { attr: 'columns', value: columns },
    bubbles: true,
    composed: true,
  }))
}

export function columnsTemplate(
  columns: readonly Column[],
  widths: (index: number) => number | undefined = () => undefined,
): string {
  const own = columns.map((s, i) => widths(i) ?? s.width)
  const set = own.filter((w): w is number => w !== undefined)
  const middle = set.length === 0
    ? 1
    : Math.max(1, Math.round(set.reduce((a, b) => a + b, 0) / set.length))
  return own.map((w) => `minmax(0, ${w ?? middle}fr)`).join(' ')
}

function withAddedColumn(columns: readonly Column[]): Column[] | null {
  if (columns.length >= COLUMNS_MAX) return null
  return withKeys([...columns, newColumn(columns.length)])
}

function withoutColumn(columns: readonly Column[], index: number): Column[] | null {
  if (columns.length <= COLUMNS_MIN || index < 0 || index >= columns.length) return null
  return columns.filter((_, i) => i !== index)
}

function withMovedColumn(
  columns: readonly Column[],
  from: number,
  to: number,
): Column[] | null {
  if (from < 0 || from >= columns.length) return null
  const target = Math.max(0, Math.min(to, columns.length - 1))
  if (target === from) return null
  const l = [...columns]
  const [column] = l.splice(from, 1)
  l.splice(target, 0, column)
  return l
}

export const COLUMN_ACCESS: Pick<
  ListBinding<Column>,
  'titleOf' | 'fieldOf' | 'withTypedTitle' | 'withPickedField' | 'withoutEditorMarks'
> = {
  titleOf: (column) => column.title,
  fieldOf: (column) => column.field,
  withTypedTitle: (column, title) =>
    withEntryValue({ ...column, title }, 'titleTyped', title.trim() === '' ? undefined : true),
  withPickedField: (column, field, fieldTitle, width) => ({
    ...column,
    ...(column.titleTyped === true ? {} : { title: fieldTitle }),
    field,
    ...(width === undefined ? {} : { width }),
  }),
  withoutEditorMarks: (column) => withEntryValue(column, 'titleTyped', undefined),
}

const TOTAL: EntrySwitch<Column> = {
  key: 'total',
  name: 'Summe in der Fußzeile',
  short: 'Summe',
  valueOf: (column) => column.total,
  withValue: (column, on) => withEntryValue(column, 'total', on),
}

const HIDDEN: EntrySwitch<Column> = {
  key: 'hidden',
  name: 'In der Maske ausblenden',
  short: 'ausgeblendet',
  valueOf: (column) => column.hidden,
  withValue: (column, on) => withEntryValue(column, 'hidden', on),
}

export const COLUMNS_BINDING: ListBinding<Column> = {
  prop: 'columns',
  defaultTitle: DEFAULT_TITLE,
  entries: coerceColumns,
  keyOf: (column) => column.key,
  ...COLUMN_ACCESS,

  entryAdd: withAddedColumn,
  entryRemove: withoutColumn,
  entryMove: withMovedColumn,

  entrySpots: '[data-ff-entry]',

  entryFlag: [TOTAL, HIDDEN],
}

export function columnsProperty(): Property<Column[]> {
  return structuredProperty<Column[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: coerceColumns(raw) }
      : { ok: false }),
    toAttribute: (value) => JSON.stringify(listForExport(value, COLUMNS_BINDING)),
    fromAttribute: (raw) => (raw === null ? defaultColumns() : tryCoerceColumns(raw)),
  }, {
    default: defaultColumns(),
    label: 'Spalten',
    place: 'block',
    attribute: 'columns',
  })
}
