import {
  booleanProperty,
  fieldProperty,
  textProperty,
  type ValuesOf,
} from '../../core/block/property'
import { COLUMN_TITLE_STANDARD } from '../behavior/cardBoard'
import { toneProperty } from '../behavior/tone'

export const kanbanColumnProperties = {
  tone: toneProperty(
    'Bedeutung der Spalte — bestimmt ihre Farbwelt (Kopf, Fläche, Rahmen).',
  ),
  heading: textProperty({
    default: COLUMN_TITLE_STANDARD,
    label: 'Titel',
    help: 'Die Überschrift der Spalte.',
    place: 'block',
    attribute: 'heading',
  }),
  value: textProperty({
    default: '',
    label: 'Wert im ERP',
    help: 'Steht im Statusfeld, wenn eine Karte hier liegt. Leer: der Titel.',
    attribute: 'value',
  }),
  catchAll: booleanProperty({
    default: false,
    label: 'Auffangspalte',
    help: 'Einträge ohne passenden Wert landen hier.',
    attribute: 'catchall',
    needsSource: true,
    onlyUnderSiblings: true,
  }),
  groupingField: fieldProperty({
    default: '',
    label: 'Unterteilen nach',
    help: 'Wähle das Datenfeld, nach dem die Spalte unterteilt wird, z. B. Mitarbeiter oder '
      + 'Raum. Die Unterteilungen heißen danach wie dieses Feld. Trage an jeder den passenden '
      + 'ERP-Wert ein; unbekannte Werte landen in der ersten.',
    attribute: 'groupingfield',
  }),
}

export type KanbanColumnValues = ValuesOf<typeof kanbanColumnProperties>
