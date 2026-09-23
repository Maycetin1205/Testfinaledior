import '../blocks/register'

import type { ReactElement } from 'react'
import {
  IconArea,
  IconDate,
  IconFormField,
  IconKanban,
  IconKanbanColumn,
  IconCard,
  IconPopup,
  IconButton,
  IconTable,
  IconText,
} from './icons/blockIcon'
import { Area } from '../blocks/area/Area'
import { Button } from '../blocks/button/Button'
import { Card } from '../blocks/card/Card'
import { DatePicker } from '../blocks/date/DatePicker'
import { FormField } from '../blocks/formfield/FormField'
import { Kanban } from '../blocks/kanban/Kanban'
import { KanbanColumn } from '../blocks/kanban/KanbanColumn'
import { Popup } from '../blocks/popup/Popup'
import { Table } from '../blocks/table/Table'
import { Text } from '../blocks/text/Text'

// The sign in the palette is the editor's business, not the block's: it is
// drawn with react and never travels into a mask.
export type BlockIcon = (properties: { size?: number | string }) => ReactElement

export const BLOCK_ICONS: Record<string, BlockIcon> = {
  [Area.type]: IconArea,
  [Button.type]: IconButton,
  [Card.type]: IconCard,
  [DatePicker.type]: IconDate,
  [FormField.type]: IconFormField,
  [Kanban.type]: IconKanban,
  [KanbanColumn.type]: IconKanbanColumn,
  [Popup.type]: IconPopup,
  [Table.type]: IconTable,
  [Text.type]: IconText,
}
