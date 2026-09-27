import '../blocks/register'

import {
  AppWindow,
  Calendar,
  IdCard,
  ListPlus,
  PanelTop,
  RectangleHorizontal,
  RectangleVertical,
  SquareKanban,
  Table as TableSign,
  TextCursorInput,
  Type,
  type Icon,
} from './icons/icon'
import { Area } from '../blocks/area/Area'
import { Button } from '../blocks/button/Button'
import { Capture } from '../blocks/capture/Capture'
import { Card } from '../blocks/card/Card'
import { DatePicker } from '../blocks/date/DatePicker'
import { FormField } from '../blocks/formfield/FormField'
import { Kanban } from '../blocks/kanban/Kanban'
import { KanbanColumn } from '../blocks/kanban/KanbanColumn'
import { Popup } from '../blocks/popup/Popup'
import { Table } from '../blocks/table/Table'
import { Text } from '../blocks/text/Text'

// The sign of a block is the editor's business, not the block's: a line sign
// in the ink around it, like the navigation of the reception mask, and it never
// travels into a mask.
export const BLOCK_ICONS: Record<string, Icon> = {
  [Area.type]: PanelTop,
  [Button.type]: RectangleHorizontal,
  [Capture.type]: ListPlus,
  [Card.type]: IdCard,
  [DatePicker.type]: Calendar,
  [FormField.type]: TextCursorInput,
  [Kanban.type]: SquareKanban,
  [KanbanColumn.type]: RectangleVertical,
  [Popup.type]: AppWindow,
  [Table.type]: TableSign,
  [Text.type]: Type,
}
