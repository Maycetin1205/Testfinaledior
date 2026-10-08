import { choiceProperty, textProperty, type ValuesOf } from '../../core/block/property'
import { emphasisProperty, toneProperty } from '../look/look'

const HEADED = { key: 'appearance', equals: 'headed' }

// The form of the area: free, as a box, or as a box with a head that carries
// its title, as .vraum of the reception mask. Color and emphasis as at every
// block; Nur Schrift colors only the title.
export const areaProperties = {
  appearance: choiceProperty([
    { value: 'plain', name: 'Frei' },
    { value: 'box', name: 'Kasten' },
    { value: 'headed', name: 'Kopfzeile' },
  ], {
    default: 'box',
    label: 'Form',
    attribute: 'appearance',
  }),
  heading: textProperty({
    default: 'Bereich',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
    when: HEADED,
  }),
  tone: toneProperty({ default: 'neutral' }),
  emphasis: emphasisProperty({ default: 'text' }),
}

export type AreaValues = ValuesOf<typeof areaProperties>
