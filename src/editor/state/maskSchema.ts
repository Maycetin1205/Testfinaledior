// Lifts a saved mask to the format this editor reads, one step per version
// from the one it was saved in. A mask before version 20, the format since
// 24.09., is not read; its data sources live in the customer file, whose
// steps all stay (librarySchema).
export const CURRENT_SCHEMA_VERSION = 23

const LIFTABLE = [20, 21, 22]

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

// Null for a mask before version 20 or from a newer editor: neither is read.
export function liftState(raw: unknown): Record<string, unknown> | null {
  if (!isPlainObject(raw) || typeof raw.schemaVersion !== 'number') return null
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION && !LIFTABLE.includes(raw.schemaVersion)) return null
  const lifted = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
  if (raw.schemaVersion < 21) liftTo21(lifted.tree)
  if (raw.schemaVersion < 22) liftTo22(lifted.tree)
  if (raw.schemaVersion < 23) liftTo23(lifted.tree)
  lifted.schemaVersion = CURRENT_SCHEMA_VERSION
  return lifted
}
