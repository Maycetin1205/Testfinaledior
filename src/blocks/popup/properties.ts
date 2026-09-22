import { numberProperty, textProperty, type ValuesOf } from '../../core/block/property'

export const popupProperties = {
  name: textProperty({
    default: 'Popup',
    label: 'Name',
    help: 'Unter diesem Namen rufen Aktionen das Popup auf.',
    place: 'block',
    attribute: 'name',
  }),
  popupWidth: numberProperty({
    default: 520,
    label: 'Breite',
    help: 'Breite des Popups in Pixeln.',
    place: 'none',
    attribute: 'popupwidth',
  }),
  popupHeight: numberProperty({
    default: 380,
    label: 'Höhe',
    help: 'Höhe des Popups in Pixeln.',
    place: 'none',
    attribute: 'popupheight',
  }),
}

export type PopupValues = ValuesOf<typeof popupProperties>
