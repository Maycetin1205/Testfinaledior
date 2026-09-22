import { booleanProperty, sourceProperty, type ValuesOf } from '../../core/block/property'
import type { Capability } from '../../core/block/capability'
import type { ListBinding } from '../../core/block/listBinding'
import { emptyTextProperty } from './emptyState'
import { dayFieldProperty } from './source'
import { columnsProperty } from './columns'
import { KEY_F4, ROW_DOUBLE, ROW_CHOSEN } from './rowActivation'

export const LIST_GRID = { startWidth: 48, startHeight: 14, minWidth: 12, minHeight: 4 }

// The properties every list carries. The order is the order in the export.
export function listProperties() {
  return {
    source: sourceProperty({
      default: '',
      label: 'Datenquelle',
      help: 'Die Quelle, deren Zeilen die Liste zeigt.',
      place: 'none',
      attribute: 'source',
    }),
    columns: columnsProperty(),
    search: booleanProperty({
      default: true,
      label: 'Suchzeile',
      help: 'Zeigt über der Tabelle ein Feld, mit dem der Bediener den Inhalt durchsucht.',
      attribute: 'search',
      needsSource: true,
    }),
    paging: booleanProperty({
      default: true,
      label: 'Blättern',
      help: 'Ja: Seiten mit Blätter-Knöpfen. Nein: alles untereinander, der Rumpf rollt.',
      attribute: 'paging',
    }),
    headerRow: booleanProperty({
      default: true,
      label: 'Kopfzeile',
      help: 'Aus: keine Titelzeile, kein Sortieren per Titelklick.',
      attribute: 'headerrow',
    }),
    columnPicker: booleanProperty({
      default: false,
      label: 'Spaltenwahl',
      help: 'In der Maske: Rechtsklick auf eine Spaltenüberschrift nimmt Spalten weg '
        + 'und holt sie zurück. Braucht die Kopfzeile.',
      attribute: 'columnpicker',
    }),
    dayField: dayFieldProperty(),
    emptyText: emptyTextProperty(),
  }
}

export type ListValues = ValuesOf<ReturnType<typeof listProperties>>

// What the list itself reads off its element. The columns stay out: every block
// reads them into its own column shape.
export type ListSettings = Omit<ListValues, 'columns'>

export function listCapabilities(binding: ListBinding): Capability[] {
  return [
    { kind: 'source' },
    { kind: 'recordPick' },
    { kind: 'followsSelection' },
    { kind: 'list', binding },
    {
      kind: 'events',
      list: [
        { key: ROW_CHOSEN, name: 'Zeile gewählt' },
        { key: ROW_DOUBLE, name: 'Zeile doppelt geklickt' },
        { key: KEY_F4, name: 'F4 – Aktion an der Zeile' },
      ],
    },
  ]
}
