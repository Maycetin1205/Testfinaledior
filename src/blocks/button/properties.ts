import { textProperty, type ValuesOf } from '../../core/block/property'

export const buttonProperties = {
  label: textProperty({
    default: 'Schaltfläche',
    label: 'Beschriftung',
    help: 'Was auf der Schaltfläche steht.',
    place: 'block',
    attribute: 'label',
  }),
}

export type ButtonValues = ValuesOf<typeof buttonProperties>
