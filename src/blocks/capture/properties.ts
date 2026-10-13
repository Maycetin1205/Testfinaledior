import { textProperty, type ValuesOf } from '../../core/block/property'
import { calculationsProperty } from '../../core/data/calculation'
import { listProperties } from '../list'
import { captureColumnsProperty } from './column'

const list = listProperties(false)

// A list without paging: the newest positions stand at the end, by the row
// being typed, as in SoftEngine's own position entry (user, 12.10.).
export const captureProperties = {
  columns: captureColumnsProperty(),
  search: list.search,
  sortByClick: list.sortByClick,
  columnPicker: list.columnPicker,
  dayField: list.dayField,
  calculations: calculationsProperty,
  // The row being typed shows the title of each required column as a quiet
  // placeholder, and this hint in the first column that is not required.
  rowHint: textProperty({
    default: '',
    label: 'Hinweis in der Tippzeile',
    place: 'display',
    attribute: 'rowhint',
  }),
}

export type CaptureValues = ValuesOf<typeof captureProperties>
