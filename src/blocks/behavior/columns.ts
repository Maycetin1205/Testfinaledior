import { assignKeys, type ListBinding } from '../../core/block/listBinding'
import { structuredProperty, type Property } from '../../core/block/property'

export type Column = {
  key: string
  title: string
  field: string

  width?: number

  total?: boolean

  hidden?: boolean
}

export interface ColumnView {
  columns: readonly Column[]
  slots: readonly number[]
}

export function columnsView(
  columns: readonly Column[],
  allShow: boolean,
  awayByOperator: ReadonlySet<string> = new Set(),
): ColumnView {
  const away = (s: Column): boolean => s.hidden === true || awayByOperator.has(s.key)
  if (allShow || !columns.some(away)) {
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

export const COLUMNS_MIN = 1

export const COLUMNS_MAX = 16

export const COLUMNS_MIN_WIDTH = 40

export const STANDARD_TITLE = 'Spalte {n}'

function standardTitleFor(index: number): string {
  return STANDARD_TITLE.replace('{n}', String(index + 1))
}

export function newColumn(index: number): Column {
  return { key: '', title: standardTitleFor(index), field: '' }
}

export function columnWithKey(columns: readonly Column[], key: string): number {
  const t = key.trim()
  if (t === '') return -1
  return columns.findIndex((s) => s.key === t)
}

export function withKeys(columns: readonly Column[]): Column[] {
  const keys = assignKeys(columns.map((s) => s.key))
  return columns.map((s, i) => (s.key === keys[i] ? s : { ...s, key: keys[i] }))
}

export function standardColumns(): Column[] {
  return withKeys([newColumn(0)])
}

function asWidth(v: unknown): number | undefined {
  const number = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(number)) return undefined
  const rounded = Math.round(number)
  return rounded < COLUMNS_MIN_WIDTH ? COLUMNS_MIN_WIDTH : rounded
}

const KNOWN_FACTS = ['key', 'title', 'field', 'width', 'total', 'hidden']

function extraFacts(o: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(o)) {
    if (value !== undefined && !KNOWN_FACTS.includes(key)) rest[key] = value
  }
  return rest
}

function asColumn(x: unknown, index: number): Column {
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    const width = o.width === undefined ? undefined : asWidth(o.width)
    const column: Column = {
      key: typeof o.key === 'string' ? o.key.trim() : '',
      title: typeof o.title === 'string' ? o.title : standardTitleFor(index),
      field: typeof o.field === 'string' ? o.field : '',

      ...(width === undefined ? {} : { width }),

      ...(typeof o.total === 'boolean' ? { total: o.total } : {}),

      ...(typeof o.hidden === 'boolean' ? { hidden: o.hidden } : {}),
    }

    return Object.assign(extraFacts(o), column)
  }

  if (typeof x === 'string') return { ...newColumn(index), title: x }
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
    arr = standardColumns()
  }

  if (arr.length < COLUMNS_MIN) arr = [newColumn(0)]
  return withKeys(arr)
}

export function tryCoerceColumns(v: string): Column[] {
  try {
    return coerceColumns(JSON.parse(v))
  } catch {
    return standardColumns()
  }
}

export function columnsRaster(
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

export function addColumnOn(columns: readonly Column[]): Column[] {
  return withKeys([...columns, newColumn(columns.length)])
}

export function withoutColumn(columns: readonly Column[], index: number): readonly Column[] {
  if (columns.length <= COLUMNS_MIN || index < 0 || index >= columns.length) return columns
  return columns.filter((_, i) => i !== index)
}

export function withMovedColumn(
  columns: readonly Column[],
  of: number,
  to: number,
): readonly Column[] {
  if (of < 0 || of >= columns.length) return columns
  const target = Math.max(0, Math.min(to, columns.length - 1))
  if (target === of) return columns
  const l = [...columns]
  const [column] = l.splice(of, 1)
  l.splice(target, 0, column)
  return l
}

export const COLUMNS_BINDING: ListBinding = {
  prop: 'columns',
  titleKey: 'title',
  fieldKey: 'field',
  keyProperty: 'key',
  standardTitle: STANDARD_TITLE,

  entryNeu: (props) => {
    const old = coerceColumns(props.columns)
    return old.length >= COLUMNS_MAX ? {} : { columns: addColumnOn(old) }
  },
  entryAway: (props, index) => {
    const old = coerceColumns(props.columns)
    const next = withoutColumn(old, index)
    return next === old ? {} : { columns: [...next] }
  },
  entryMove: (props, of, to) => {
    const old = coerceColumns(props.columns)
    const next = withMovedColumn(old, of, to)
    return next === old ? {} : { columns: [...next] }
  },

  entrySpots: '[data-ff-entry]',

  entryFlag: [
    {
      key: 'total',
      name: 'Summe in der Fußzeile',
      short: 'Summe',
    },
    {
      key: 'hidden',
      name: 'In der Maske ausblenden',
      short: 'ausgeblendet',
    },
  ],
}

export function columnsProperty(): Property<Column[]> {
  return structuredProperty<Column[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: coerceColumns(raw) }
      : { ok: false, reason: 'Spaltenliste erwartet' }),
    toAttribute: (value) => JSON.stringify(value),
    fromAttribute: (raw) => (raw === null ? standardColumns() : tryCoerceColumns(raw)),
  }, {
    default: standardColumns(),
    label: 'Spalten',
    help: 'Welche Felder in welcher Reihenfolge stehen.',
    place: 'block',
    attribute: 'columns',
  })
}
