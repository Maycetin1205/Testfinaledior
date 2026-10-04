import { sourceProperty, type Property } from './property'

export const SOURCE_PROP = 'source'

// The one source a block reads: declared once, listed by every block that
// reads data where it stands in its export.
export const SOURCE_PROPERTY: Property<string> = sourceProperty({
  default: '',
  label: 'Datenquelle',
  place: 'none',
  attribute: SOURCE_PROP,
})
