import {
  booleanProperty,
  listProperty,
  readValues,
  segmentProperty,
  textProperty,
  type Property,
} from '../../core/block/property'
import { listDefaultTitle, type ListBinding } from '../../core/block/listBinding'
import { isUnread } from '../../core/unread'
import { toneProperty } from '../look/look'

// A place in a column, where a card lies: its name, typed on its head, and the
// value it stands for in the field the board sorts by.
const kanbanPlaceProperties = {
  name: textProperty({
    default: 'Platz',
    label: 'Name',
    place: 'block',
    attribute: 'name',
  }),
  value: textProperty({
    default: '',
    label: 'Wert',
    attribute: 'value',
    nameFromParentField: 'columnsField',
  }),
}

// A column of the board: its title, typed on its head; the button under its
// cards, its text typed on the card, that moves a card on to the next column,
// runs the board's action or is not there; whether it lays its cards out by
// the clock; its tone; whether it takes the cards whose value no place names;
// and its places, one at least. A column with one place shows no place of its
// own.
const kanbanColumnProperties = {
  heading: textProperty({
    default: 'Neue Spalte',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
  }),
  button: textProperty({
    default: '',
    label: 'Knopftext',
    place: 'block',
    attribute: 'button',
  }),
  buttonKind: segmentProperty([
    { value: 'none', name: 'Aus' },
    { value: 'next', name: 'Weiter' },
    { value: 'action', name: 'Aktion' },
  ], {
    default: 'none',
    label: 'Knopf',
    attribute: 'buttonkind',
  }),
  byTime: booleanProperty({
    default: false,
    label: 'Nach Uhrzeit',
    attribute: 'bytime',
    needsSource: true,
  }),
  tone: toneProperty(),
  catchAll: booleanProperty({
    default: false,
    label: 'Auffangspalte',
    attribute: 'catchall',
    needsSource: true,
    onlyUnderSiblings: true,
  }),
}

export interface KanbanPlace {
  name: string
  value: string
}

export type ButtonKind = 'none' | 'next' | 'action'

const BUTTON_KINDS: readonly ButtonKind[] = ['none', 'next', 'action']

export interface KanbanColumn {
  heading: string
  button: string
  buttonKind: ButtonKind
  byTime: boolean
  tone: string
  catchAll: boolean
  places: KanbanPlace[]
}

const place = (name: string): KanbanPlace => ({ name, value: '' })

function column(heading: string, tone: string): KanbanColumn {
  return { heading, button: '', buttonKind: 'none', byTime: false, tone, catchAll: false, places: [place(heading)] }
}

function defaultKanbanColumns(): KanbanColumn[] {
  return [column('Offen', 'warning'), column('In Arbeit', 'info'), column('Fertig', 'success')]
}

// What an entry lacks takes the default of its declaration.
function placeFrom(raw: unknown): KanbanPlace {
  const values = readValues(kanbanPlaceProperties, isUnread<KanbanPlace>(raw) ? raw : {})
  return { name: String(values.name), value: String(values.value) }
}

function kanbanPlacesFrom(raw: unknown): KanbanPlace[] {
  return Array.isArray(raw) ? raw.map(placeFrom) : []
}

function columnFrom(raw: unknown): KanbanColumn {
  const entry = isUnread<KanbanColumn>(raw) ? raw : {}
  const values = readValues(kanbanColumnProperties, entry)
  const heading = String(values.heading)
  const places = kanbanPlacesFrom(entry.places)
  return {
    heading,
    button: String(values.button),
    buttonKind: BUTTON_KINDS.find((k) => k === values.buttonKind) ?? 'none',
    byTime: values.byTime === true,
    tone: String(values.tone),
    catchAll: values.catchAll === true,
    places: places.length > 0 ? places : [place(heading)],
  }
}

function kanbanColumnsFrom(raw: unknown): KanbanColumn[] {
  return Array.isArray(raw) ? raw.map(columnFrom) : defaultKanbanColumns()
}

export function kanbanColumnsProperty(): Property<KanbanColumn[]> {
  return listProperty<KanbanColumn[]>(kanbanColumnsFrom, {
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

// The places of a column at their heads: name typed on the head, value in the
// bar, added from the bar at the column's head. A column keeps one place.
const KANBAN_PLACES_BINDING: ListBinding<KanbanPlace> = {
  prop: 'places',
  defaultTitle: 'Platz {n}',
  fieldless: true,
  entryProperties: { value: kanbanPlaceProperties.value },
  entries: kanbanPlacesFrom,
  titleOf: (p) => p.name,
  fieldOf: () => '',
  withTypedTitle: (p, name) => ({ ...p, name }),
  withPickedField: (p) => p,
  withoutEditorMarks: (p) => p,
  entryAdd: (places) => [...places, place(listDefaultTitle(KANBAN_PLACES_BINDING, places.length))],
  entryRemove: (places, index) => (places.length <= 1 ? null : places.filter((_, i) => i !== index)),
  entryMove: moved,
}

// The columns of a board as the editor handles them at their heads: title
// typed on the head, tone and catch-all in the bar at the head, plus at the
// end, moved by dragging the head. A board keeps one column at least.
export const KANBAN_COLUMNS_BINDING: ListBinding<KanbanColumn> = {
  prop: 'columns',
  defaultTitle: 'Spalte {n}',
  fieldless: true,
  entryProperties: {
    buttonKind: kanbanColumnProperties.buttonKind,
    byTime: kanbanColumnProperties.byTime,
    tone: kanbanColumnProperties.tone,
    catchAll: kanbanColumnProperties.catchAll,
  },
  inner: {
    binding: KANBAN_PLACES_BINDING,
    of: (c) => c.places,
    with: (c, places) => ({ ...c, places: kanbanPlacesFrom(places) }),
  },
  entries: kanbanColumnsFrom,
  titleOf: (c) => c.heading,
  fieldOf: () => '',
  withTypedTitle: (c, title) => ({ ...c, heading: title }),
  withPickedField: (c) => c,
  withoutEditorMarks: (c) => c,
  entryAdd: (entries) => [...entries, column(listDefaultTitle(KANBAN_COLUMNS_BINDING, entries.length), 'info')],
  entryRemove: (entries, index) => (entries.length <= 1 ? null : entries.filter((_, i) => i !== index)),
  entryMove: moved,
  entryHeads: true,
}
