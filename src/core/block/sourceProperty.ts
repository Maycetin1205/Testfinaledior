import { sourceProperty, type Property } from './property'

export const SOURCE_PROP = 'source'

// The one source a block reads: declared once, brought to every block whose
// capabilities name a source.
export const SOURCE_PROPERTY: Property<string> = sourceProperty({
  default: '',
  label: 'Datenquelle',
  place: 'none',
  attribute: SOURCE_PROP,
})

// The source on the element, for a block that reads it there itself.
export interface SourceValue {
  source: string
}
