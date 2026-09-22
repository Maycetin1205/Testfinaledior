import '../blocks/register'

import { addEditorFacts } from '../core/block/editorFacts'
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
  IconDivider,
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
import { Divider } from '../blocks/divider/Divider'

const ICONS = [
  [Area.type, IconArea],
  [Button.type, IconButton],
  [Card.type, IconCard],
  [DatePicker.type, IconDate],
  [FormField.type, IconFormField],
  [Kanban.type, IconKanban],
  [KanbanColumn.type, IconKanbanColumn],
  [Popup.type, IconPopup],
  [Table.type, IconTable],
  [Text.type, IconText],
  [Divider.type, IconDivider],
] as const

for (const [type, symbol] of ICONS) addEditorFacts(type, { symbol })
