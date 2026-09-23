import { numberProperty, textProperty, type ValuesOf } from '../../core/block/property'

export const popupProperties = {
  name: textProperty({
    default: 'Popup',
    label: 'Name',
    place: 'block',
    attribute: 'name',
  }),
  popupWidth: numberProperty({
    default: 520,
    label: 'Breite',
    place: 'none',
    attribute: 'popupwidth',
  }),
  popupHeight: numberProperty({
    default: 380,
    label: 'Höhe',
    place: 'none',
    attribute: 'popupheight',
  }),
}

export type PopupValues = ValuesOf<typeof popupProperties>
