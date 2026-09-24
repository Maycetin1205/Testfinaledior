import { choiceProperty, textProperty, type ValuesOf } from '../../core/block/property'

export const buttonProperties = {
  label: textProperty({
    default: 'Schaltfläche',
    label: 'Beschriftung',
    place: 'block',
    attribute: 'label',
  }),
  variant: choiceProperty([
    { value: 'standard', name: 'Standard' },
    { value: 'primary', name: 'Hervorgehoben' },
    { value: 'quiet', name: 'Leise' },
    { value: 'ghost', name: 'Ohne Rahmen' },
  ], {
    default: 'standard',
    label: 'Aussehen',
    attribute: 'variant',
  }),
}

export type ButtonValues = ValuesOf<typeof buttonProperties>
