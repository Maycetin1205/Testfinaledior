import { choiceProperty, textProperty, type ValuesOf } from '../../core/block/property'
import { openedByProperty } from '../../core/block/opening'
import { toneProperty } from '../tone/tone'

const HEADED = { key: 'appearance', equals: 'headed' }

// How the area stands on the page: free, as a box, or as a box with a head
// that carries its title in a tone, as .vraum of the reception mask.
export const areaProperties = {
  appearance: choiceProperty([
    { value: 'plain', name: 'Frei' },
    { value: 'box', name: 'Kasten' },
    { value: 'headed', name: 'Kopfzeile' },
  ], {
    default: 'box',
    label: 'Aussehen',
    attribute: 'appearance',
  }),
  heading: textProperty({
    default: 'Bereich',
    label: 'Titel',
    place: 'block',
    attribute: 'heading',
    when: HEADED,
  }),
  tone: toneProperty(HEADED),
  openedBy: openedByProperty,
}

export type AreaValues = ValuesOf<typeof areaProperties>
