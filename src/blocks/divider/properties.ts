import {
  choiceProperty,
  numberProperty,
  segmentProperty,
  type ValuesOf,
} from '../../core/block/property'

export const THICKNESS_MIN = 1
export const THICKNESS_MAX = 8

export const dividerProperties = {
  direction: segmentProperty([
    { value: 'horizontal', name: 'Waagerecht' },
    { value: 'vertical', name: 'Senkrecht' },
  ], {
    default: 'horizontal',
    label: 'Richtung',
    help: 'Die Linie waagerecht oder senkrecht ausrichten.',
    attribute: 'direction',
  }),
  lineStyle: choiceProperty([
    { value: 'solid', name: 'Durchgezogen' },
    { value: 'dashed', name: 'Gestrichelt' },
    { value: 'dotted', name: 'Gepunktet' },
  ], {
    default: 'solid',
    label: 'Linienstil',
    help: 'Durchgezogen, gestrichelt oder gepunktet.',
    attribute: 'linestyle',
  }),
  thickness: numberProperty({
    default: 1,
    label: 'Stärke',
    help: 'Dicke der Linie in Pixeln.',
    attribute: 'thickness',
    unit: 'px',
    min: THICKNESS_MIN,
    max: THICKNESS_MAX,
  }),
  color: choiceProperty([
    { value: 'line', name: 'Standard' },
    { value: 'quiet', name: 'Dezent' },
    { value: 'dark', name: 'Dunkel' },
    { value: 'accent', name: 'Akzent' },
  ], {
    default: 'line',
    label: 'Farbe',
    help: 'Farbe der Linie aus den Farben der Maske.',
    attribute: 'color',
  }),
}

export type DividerValues = ValuesOf<typeof dividerProperties>
