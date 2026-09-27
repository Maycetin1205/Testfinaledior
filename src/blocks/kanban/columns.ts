import {
  booleanProperty,
  readValues,
  structuredProperty,
  textProperty,
  type Property,
} from '../../core/block/property'
import { listDefaultTitle, type ListBinding } from '../../core/block/listBinding'
import { isUnread } from '../../core/unread'
import { toneProperty } from '../tone/tone'

// A column of the board: its title, typed on its head; its tone; the value it
// stands for in the field the board sorts by; and whether it takes the cards
// whose value no other column names.
export const kanbanColumnProperties = {
  heading: textProperty({
    default: 'Neue Spalte',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
  }),
  tone: toneProperty(),
  value: textProperty({
    default: '',
    label: 'Wert',
    attribute: 'value',
    nameFromParentField: 'columnsField',
  }),
  catchAll: booleanProperty({
    default: false,
    label: 'Auffangspalte',
    attribute: 'catchall',
    needsSource: true,
    onlyUnderSiblings: true,
  }),
}

export interface KanbanColumn {
  heading: string
  tone: string
  value: string
  catchAll: boolean
}

// The title is typed on the head; the bar at the head holds the rest.
const IN_THE_BAR = {
  tone: kanbanColumnProperties.tone,
  value: kanbanColumnProperties.value,
  catchAll: kanbanColumnProperties.catchAll,
}

const DEFAULT_TITLE = 'Spalte {n}'

function column(heading: string, tone: string): KanbanColumn {
  return { heading, tone, value: '', catchAll: false }
}

export function defaultKanbanColumns(): KanbanColumn[] {
  return [column('Offen', 'warning'), column('In Arbeit', 'info'), column('Fertig', 'success')]
}

// What a column lacks takes the default of its declaration.
function columnFrom(raw: unknown): KanbanColumn {
  const values = readValues(kanbanColumnProperties, isUnread<KanbanColumn>(raw) ? raw : {})
  return {
    heading: String(values.heading),
    tone: String(values.tone),
    value: String(values.value),
    catchAll: values.catchAll === true,
  }
}

export function kanbanColumnsFrom(raw: unknown): KanbanColumn[] {
  return Array.isArray(raw) ? raw.map(columnFrom) : defaultKanbanColumns()
}

function kanbanColumnsFromText(raw: string): KanbanColumn[] {
  try {
    return kanbanColumnsFrom(JSON.parse(raw))
  } catch {
    return defaultKanbanColumns()
  }
}

export function kanbanColumnsProperty(): Property<KanbanColumn[]> {
  return structuredProperty<KanbanColumn[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: kanbanColumnsFrom(raw) }
      : { ok: false }),
    toAttribute: (value) => JSON.stringify(value),
    fromAttribute: (raw) => (raw === null ? defaultKanbanColumns() : kanbanColumnsFromText(raw)),
  }, {
    default: defaultKanbanColumns(),
    label: 'Spalten',
    place: 'block',
    attribute: 'columns',
  })
}

function moved<E>(entries: readonly E[], from: number, to: number): E[] | null {
  if (from === to || entries[from] === undefined) return null
  const next = [...entries]
  const [entry] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, entry)
  return next
}

// The columns of a board as the editor handles them at their heads: title
// typed on the head, tone, value and catch-all in the bar at the head, plus at
// the end, moved by dragging the head. A board keeps one column at least.
export const KANBAN_COLUMNS_BINDING: ListBinding<KanbanColumn> = {
  prop: 'columns',
  defaultTitle: DEFAULT_TITLE,
  fieldless: true,
  entryProperties: IN_THE_BAR,
  entries: kanbanColumnsFrom,
  titleOf: (c) => c.heading,
  fieldOf: () => '',
  withTypedTitle: (c, title) => ({ ...c, heading: title }),
  withPickedField: (c) => c,
  withoutEditorMarks: (c) => c,
  entryAdd: (entries) => [...entries, column(listDefaultTitle(KANBAN_COLUMNS_BINDING, entries.length), 'info')],
  entryRemove: (entries, index) => (entries.length <= 1 ? null : entries.filter((_, i) => i !== index)),
  entryMove: moved,
  entrySpots: '[data-ff-entry]',
}
