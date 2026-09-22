import { textProperty, type ValuesOf } from '../../core/block/property'
import { ROOM_TITLE_STANDARD } from '../behavior/cardBoard'

export const kanbanRoomProperties = {
  heading: textProperty({
    default: ROOM_TITLE_STANDARD,
    label: 'Titel',
    help: 'Die Überschrift der Unterteilung.',
    place: 'block',
    attribute: 'heading',
  }),
  value: textProperty({
    default: '',
    label: 'Wert im ERP',
    help: 'Steht im Feld der Unterteilung, wenn eine Karte hier liegt. Leer: der Titel.',
    attribute: 'value',
  }),
}

export type KanbanRoomValues = ValuesOf<typeof kanbanRoomProperties>
