export const SOURCES_DIVIDER = '::'

interface FieldTarget {
  sourceId: string
  code: string
}

export function bindingWithSource(sourceId: string, code: string): string {
  if (sourceId === '' || code === '') return code
  return `${sourceId}${SOURCES_DIVIDER}${code}`
}

// A spot that takes several fields holds them in one binding, joined by what
// stands between their values: a dot or a space. A field code has no space.
export const BINDING_JOINERS = [' · ', ' '] as const

export type BindingJoiner = typeof BINDING_JOINERS[number]

export function bindingFields(value: string): string[] {
  return value.split(bindingJoiner(value)).filter((f) => f.trim() !== '')
}

export function bindingJoiner(value: string): BindingJoiner {
  return value.includes(BINDING_JOINERS[0]) || !value.includes(BINDING_JOINERS[1])
    ? BINDING_JOINERS[0]
    : BINDING_JOINERS[1]
}

export function joinedBinding(fields: readonly string[], joiner: BindingJoiner): string {
  return fields.join(joiner)
}

// A field chosen again leaves the spot, any other joins it at the end.
export function toggledBinding(value: string, field: string): string {
  const fields = bindingFields(value)
  const next = fields.includes(field) ? fields.filter((f) => f !== field) : [...fields, field]
  return joinedBinding(next, bindingJoiner(value))
}

export function splitBinding(value: string): FieldTarget {
  const parts = value.split(SOURCES_DIVIDER)
  if (parts.length !== 2) return { sourceId: '', code: value }
  const [sourceId, code] = parts
  if (sourceId === '' || code === '') return { sourceId: '', code: value }
  return { sourceId, code }
}
