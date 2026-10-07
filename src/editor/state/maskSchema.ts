// Lifts a saved mask to the format this editor reads, one step per version
// from the one it was saved in. A mask before version 20, the format since
// 24.09., is not read; its data sources live in the customer file, whose
// steps all stay (librarySchema).
import { splitBinding } from '../../core/block/binding'
import { numberText } from '../../core/data/number'

export const CURRENT_SCHEMA_VERSION = 26

const LIFTABLE = [20, 21, 22, 23, 24, 25]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// ---- version 21: a text takes a variant, not size, weight and color; a field looks plain, not line ----

// The size a text had while it stored none.
const OLD_TEXT_SIZE = 14

// Bold becomes a title from 15 px up and a heading below, small type a label,
// muted type the muted variant. Accent and tone colors fall away: the reception
// mask does not color free text.
function textVariant(values: Record<string, unknown>): string {
  const size = typeof values.size === 'number' ? values.size : OLD_TEXT_SIZE
  if (values.weight === 'bold') return size >= 15 ? 'title' : 'heading'
  if (size <= 11.5) return 'label'
  if (values.color === 'muted') return 'muted'
  return 'body'
}

function liftTo21(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      values.variant = textVariant(values)
      delete values.size
      delete values.weight
      delete values.color
    }
    if (node.type === 'formfield' && values.appearance === 'line') values.appearance = 'plain'
  }
}

// ---- version 22: a field looks up as a text field with the switch on; a text field takes two lines by its height ----

function liftTo22(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'formfield' || !isPlainObject(node.values)) continue
    const values = node.values
    if (values.fieldType === 'lookup') values.lookup = true
    if (values.fieldType === 'lookup' || values.fieldType === 'textarea') values.fieldType = 'text'
  }
}

// ---- version 23: a kanban draws its columns and its card itself ----

const COLUMN_VALUES_23 = ['heading', 'tone', 'catchAll']
const CARD_VALUES_23 = [
  'chipTone', 'heading', 'heading2', 'time', 'date', 'subline', 'text', 'chip',
  'headingField', 'heading2Field', 'timeField', 'dateField', 'sublineField', 'textField', 'chipField',
]

function picked(values: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(values)) return {}
  return Object.fromEntries(keys.filter((key) => key in values).map((key) => [key, values[key]]))
}

// The column blocks become the board's columns, each with one place holding
// the column's value; the card block becomes the board's card. Both leave the
// tree.
function liftTo23(tree: unknown): void {
  if (!isPlainObject(tree)) return
  const drop = (id: unknown): void => {
    if (typeof id !== 'string') return
    const node = tree[id]
    if (isPlainObject(node) && Array.isArray(node.childIds)) node.childIds.forEach(drop)
    delete tree[id]
  }
  for (const board of Object.values(tree)) {
    if (!isPlainObject(board) || board.type !== 'kanban' || !Array.isArray(board.childIds)) continue
    const values = isPlainObject(board.values) ? board.values : {}
    const children = board.childIds
      .map((id) => (typeof id === 'string' ? tree[id] : undefined))
      .filter(isPlainObject)
    const columns = children
      .filter((child) => child.type === 'kanban-column')
      .map((child) => {
        const own = isPlainObject(child.values) ? child.values : {}
        return {
          ...picked(own, COLUMN_VALUES_23),
          places: [{ ...picked(own, ['value']), ...('heading' in own ? { name: own.heading } : {}) }],
        }
      })
    if (columns.length > 0) values.columns = columns
    const card = children.find((child) => child.type === 'card')
    if (card) Object.assign(values, picked(card.values, CARD_VALUES_23))
    board.values = values
    board.childIds.forEach(drop)
    board.childIds = []
  }
}

// ---- version 24: an area has as many columns as it is wide on the page ----

// Up to 23 an area split itself into 48 columns of its own, whatever its
// width. What it holds is carried over to its new columns at the same size.
const OLD_AREA_COLUMNS = 48

function cellOf(values: Record<string, unknown>, key: string, fallback: number): number {
  const v = values[key]
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback
}

function liftTo24(tree: unknown): void {
  if (!isPlainObject(tree)) return
  // From the outside in: an area inside an area gets its width first.
  const carry = (id: unknown): void => {
    const node = typeof id === 'string' ? tree[id] : undefined
    if (!isPlainObject(node) || !Array.isArray(node.childIds)) return
    if (node.type === 'area' && isPlainObject(node.values)) {
      const columns = Math.max(1, cellOf(node.values, 'gridW', OLD_AREA_COLUMNS))
      for (const childId of node.childIds) {
        const child = typeof childId === 'string' ? tree[childId] : undefined
        if (!isPlainObject(child) || !isPlainObject(child.values)) continue
        const x = Math.min(columns - 1, Math.round(cellOf(child.values, 'gridX', 0) * columns / OLD_AREA_COLUMNS))
        const w = Math.max(1, Math.round(cellOf(child.values, 'gridW', OLD_AREA_COLUMNS) * columns / OLD_AREA_COLUMNS))
        child.values.gridX = x
        child.values.gridW = Math.min(w, columns - x)
      }
    }
    node.childIds.forEach(carry)
  }
  Object.entries(tree)
    .filter(([, node]) => isPlainObject(node) && (node.parentId === null || node.parentId === undefined))
    .forEach(([id]) => carry(id))
}

// ---- version 25: a calculation is one sentence at a column head ----

// Up to 24 a calculation had a lead factor, a numerator and a denominator,
// each factor a column, a data field or a number with a unit. The sentence
// keeps the columns, the fields and the numbers; the units fall away.
function termFrom25(factor: unknown, divides: boolean): Record<string, unknown> | null {
  if (!isPlainObject(factor)) return null
  if (factor.kind === 'column' && typeof factor.column === 'string' && factor.column !== '') {
    return { kind: 'row', value: factor.column, divides }
  }
  if (factor.kind === 'dataField' && typeof factor.field === 'string' && factor.field !== '') {
    const { sourceId, code } = splitBinding(factor.field)
    return { kind: 'helper', ...(sourceId === '' ? {} : { sourceId }), value: code, divides }
  }
  if (factor.kind === 'number' && typeof factor.number === 'number') {
    return { kind: 'fixed', value: numberText(factor.number, 6), divides }
  }
  return null
}

function liftTo25(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values) || !Array.isArray(node.values.calculations)) continue
    node.values.calculations = node.values.calculations.flatMap((old: unknown) => {
      if (!isPlainObject(old) || !isPlainObject(old.lead) || typeof old.lead.column !== 'string') return []
      const factors = (list: unknown, divides: boolean) =>
        (Array.isArray(list) ? list : []).flatMap((f) => termFrom25(f, divides) ?? [])
      const round = isPlainObject(old.lead.round) ? old.lead.round.decimals : undefined
      return [{
        key: old.key,
        lead: old.lead.column,
        terms: [...factors(old.numerator, false), ...factors(old.denominator, true)],
        decimals: typeof round === 'number' ? round : 2,
      }]
    })
  }
}

// ---- version 26: the button of a kanban column is off, on to the next column or the action ----

// Up to 25 a column with a button text moved the card on, one without had none.
function liftTo26(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'kanban' || !isPlainObject(node.values)) continue
    if (!Array.isArray(node.values.columns)) continue
    for (const column of node.values.columns) {
      if (!isPlainObject(column) || column.buttonKind !== undefined) continue
      column.buttonKind = typeof column.button === 'string' && column.button.trim() !== '' ? 'next' : 'none'
    }
  }
}

// Null for a mask before version 20 or from a newer editor: neither is read.
export function liftState(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw) || typeof raw.schemaVersion !== 'number') return null
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION && !LIFTABLE.includes(raw.schemaVersion)) return null
  const lifted = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  if (raw.schemaVersion < 21) liftTo21(lifted.tree)
  if (raw.schemaVersion < 22) liftTo22(lifted.tree)
  if (raw.schemaVersion < 23) liftTo23(lifted.tree)
  if (raw.schemaVersion < 24) liftTo24(lifted.tree)
  if (raw.schemaVersion < 25) liftTo25(lifted.tree)
  if (raw.schemaVersion < 26) liftTo26(lifted.tree)
  lifted.schemaVersion = CURRENT_SCHEMA_VERSION
  return lifted
}
