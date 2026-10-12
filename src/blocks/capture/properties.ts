import { numberProperty, type ValuesOf } from '../../core/block/property'
import { calculationsProperty } from '../../core/data/calculation'
import { listProperties } from '../list'
import { captureColumnsProperty } from './column'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../dialog/DialogFrame'

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
  windowWidth: numberProperty({
    default: WINDOW_WIDTH,
    label: 'Fensterbreite',
    place: 'none',
    attribute: 'lookupwidth',
  }),
  windowHeight: numberProperty({
    default: WINDOW_HEIGHT,
    label: 'Fensterhöhe',
    place: 'none',
    attribute: 'lookupheight',
  }),
}

export type CaptureValues = ValuesOf<typeof captureProperties>
