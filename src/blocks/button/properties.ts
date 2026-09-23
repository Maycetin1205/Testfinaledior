import { textProperty, type ValuesOf } from '../../core/block/property'

export const buttonProperties = {
  label: textProperty({
    default: 'Schaltfläche',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
}

export type ButtonValues = ValuesOf<typeof buttonProperties>
