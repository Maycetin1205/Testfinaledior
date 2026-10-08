import { textProperty, type ValuesOf } from '../../core/block/property'
import { spotBinding, typedSpot } from '../parts/card'

export const dataListProperties = {
  addLabel: textProperty({
    default: '+ Neu',
    label: 'Plus',
    place: 'block',
    attribute: 'addlabel',
  }),
  heading: typedSpot('Titel', 'heading'),
  subline: typedSpot('Unterzeile', 'subline'),
  headingField: spotBinding('Titel', 'headingfield'),
  sublineField: spotBinding('Unterzeile', 'sublinefield'),
  avatarField: spotBinding('Tiersymbol', 'avatarfield'),
}

export type DataListValues = ValuesOf<typeof dataListProperties>

// The spots every row of the list has, in the order the editor offers them.
export const ROW_SPOTS = [
  { prop: 'heading', name: 'Titel', several: true },
  { prop: 'subline', name: 'Unterzeile', several: true },
] as const

export type RowSpot = (typeof ROW_SPOTS)[number]['prop']

// The avatar is only ever bound: the outline of the animal its field names.
export const AVATAR_SPOT = { prop: 'avatar', name: 'Tiersymbol' } as const
