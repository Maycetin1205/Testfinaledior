import { textProperty, type ValuesOf } from '../../core/block/property'
import { emphasisProperty, sizeProperty, toneProperty } from '../look/look'

export const buttonProperties = {
  label: textProperty({
    default: 'Schaltfläche',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
  tone: toneProperty({ default: 'neutral' }),
  emphasis: emphasisProperty(),
  size: sizeProperty(),
}

export type ButtonValues = ValuesOf<typeof buttonProperties>
