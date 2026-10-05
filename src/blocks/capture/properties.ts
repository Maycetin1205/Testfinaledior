import { listProperty, numberProperty, type ValuesOf } from '../../core/block/property'
import {
  calculationsForExport,
  calculationsFrom,
  type Calculation,
} from '../../core/data/calculation'
import { listProperties } from '../list/listDeclaration'
import { captureColumnsProperty } from './column'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../dialog/DialogFrame'

export const captureProperties = {
  ...listProperties(false),
  columns: captureColumnsProperty(),
  calculations: listProperty<Calculation[]>(calculationsFrom, {
    default: [],
    label: 'Berechnungen',
    place: 'none',
    attribute: 'calculations',
  }, calculationsForExport),
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
