import { fieldProperty, type Property } from './property'

// The field a list filters by the chosen day: declared once, listed by the
// lists and the board, read by the mask through the same declaration.
export const DAY_FIELD_PROPERTY: Property<string> = fieldProperty({
  default: '',
  label: 'Tag filtern nach',
  place: 'source',
  attribute: 'dayfield',
})
