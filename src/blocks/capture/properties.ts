import { numberProperty, type ValuesOf } from '../../core/block/property'
import { calculationsProperty } from '../../core/data/calculation'
import { listProperties } from '../list'
import { captureColumnsProperty } from './column'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../dialog/DialogFrame'

export const captureProperties = {
  ...listProperties(false),
  columns: captureColumnsProperty(),
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
