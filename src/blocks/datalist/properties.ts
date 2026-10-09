import { choiceProperty, type Condition, type ValuesOf } from '../../core/block/property'
import { spotBinding, typedSpot } from '../parts/card'
import { symbolProperty } from '../look/symbol'

// What a click on a row does: one row is chosen and the blocks that follow
// the list read it, as at the table; several rows are ticked; or none.
export const dataListProperties = {
  pick: choiceProperty([
    { value: 'one', name: 'Eine Zeile' },
    { value: 'several', name: 'Mehrere' },
    { value: 'none', name: 'Keine' },
  ], {
    default: 'one',
    label: 'Auswahl',
    attribute: 'pick',
  }),
  heading: typedSpot('Titel', 'heading'),
  subline: typedSpot('Unterzeile', 'subline'),
  aside: typedSpot('Rechts', 'aside'),
  headingField: spotBinding('Titel', 'headingfield'),
  sublineField: spotBinding('Unterzeile', 'sublinefield'),
  asideField: spotBinding('Rechts', 'asidefield'),
  avatarField: spotBinding('Tiersymbol', 'avatarfield'),
  // The symbol in the circle of every row, while no field names an animal.
  symbol: symbolProperty(),
}

export type DataListValues = ValuesOf<typeof dataListProperties>

export const PICK_ONE: Condition<'pick'> = { key: 'pick', equals: 'one' }

// The spots every row of the list has, in the order the editor offers them:
// the title, the line under it and, on the right, a short value such as an
// age or an amount.
export const ROW_SPOTS = [
  { prop: 'heading', name: 'Titel', several: true },
  { prop: 'subline', name: 'Unterzeile', several: true },
  { prop: 'aside', name: 'Rechts', several: true },
] as const

export type RowSpot = (typeof ROW_SPOTS)[number]['prop']

// The avatar is only ever bound: the outline of the animal its field names.
export const AVATAR_SPOT = { prop: 'avatar', name: 'Tiersymbol' } as const
