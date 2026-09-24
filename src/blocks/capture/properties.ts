import { numberProperty, structuredProperty, type ValuesOf } from '../../core/block/property'
import {
  calculationsForExport,
  calculationsFrom,
  type Calculation,
} from '../../core/data/calculation'
import { listProperties } from '../list/listDeclaration'
import { captureColumnsProperty } from './column'
import { deletableProperty } from './body'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../dialog/DialogFrame'

export const captureProperties = {
  ...listProperties(),
  columns: captureColumnsProperty(),
  deletable: deletableProperty(),
  calculations: structuredProperty<Calculation[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: calculationsFrom(raw) }
      : { ok: false }),
    toAttribute: (value) => JSON.stringify(calculationsForExport(value)),
    fromAttribute: (raw) => {
      if (raw === null) return []
      try {
        return calculationsFrom(JSON.parse(raw))
      } catch {
        return []
      }
    },
  }, {
    default: [],
    label: 'Berechnungen',
    place: 'none',
    attribute: 'calculations',
  }),
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
