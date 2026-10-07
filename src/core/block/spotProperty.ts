import { fieldProperty, textProperty, type Property } from './property'

// A spot of a card or a row: typed on the block itself, or bound to a field.
export function typedSpot(label: string, attribute: string): Property<string> {
  return textProperty({
    default: '',
    label,
    place: 'block',
    attribute,
  })
}

export function spotBinding(label: string, attribute: string): Property<string> {
  return fieldProperty({
    default: '',
    label: `${label} — Feld`,
    place: 'none',
    attribute,
  })
}
