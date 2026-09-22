import { numberProperty, structuredProperty, type ValuesOf } from '../../core/block/property'
import {
  calculationsForExport,
  calculationsFrom,
  type Calculation,
} from '../../core/data/calculation'
import { listProperties } from '../behavior/listDeclaration'
import { captureColumnsProperty } from './column'
import { deletableProperty } from './rowEditing'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '../behavior/lookup'
import { reportError } from '../../softengine/report'

const UNREADABLE = 'Die Berechnungen dieser Erfassung sind unlesbar; sie rechnet nicht.'

export const captureProperties = {
  ...listProperties(),
  columns: captureColumnsProperty(),
  deletable: deletableProperty(),
  calculations: structuredProperty<Calculation[]>({
    read: (raw) => (raw === undefined || Array.isArray(raw)
      ? { ok: true, value: calculationsFrom(raw) }
      : { ok: false, reason: 'Liste von Berechnungen erwartet' }),
    toAttribute: (value) => JSON.stringify(calculationsForExport(value)),
    fromAttribute: (raw) => {
      if (raw === null) return []
      try {
        return calculationsFrom(JSON.parse(raw))
      } catch {
        reportError(UNREADABLE)
        return []
      }
    },
  }, {
    default: [],
    label: 'Berechnungen',
    help: 'Rechnungen, die eine Zelle aus anderen Zellen füllen.',
    place: 'none',
    attribute: 'calculations',
  }),
  windowWidth: numberProperty({
    default: WINDOW_WIDTH,
    label: 'Fensterbreite',
    help: 'Breite des Nachschlage-Fensters in Pixeln.',
    place: 'none',
    attribute: 'lookupwidth',
  }),
  windowHeight: numberProperty({
    default: WINDOW_HEIGHT,
    label: 'Fensterhöhe',
    help: 'Höhe des Nachschlage-Fensters in Pixeln.',
    place: 'none',
    attribute: 'lookupheight',
  }),
}

export type CaptureValues = ValuesOf<typeof captureProperties>
