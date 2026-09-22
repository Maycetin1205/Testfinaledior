export const SOURCES_DIVIDER = '::'

export interface FieldTarget {
  sourceId: string
  code: string
}

export function bindingWithSource(sourceId: string, code: string): string {
  if (sourceId === '' || code === '') return code
  return `${sourceId}${SOURCES_DIVIDER}${code}`
}

export function splitBinding(value: string): FieldTarget {
  const parts = value.split(SOURCES_DIVIDER)
  if (parts.length !== 2) return { sourceId: '', code: value }
  const [sourceId, code] = parts
  if (sourceId === '' || code === '') return { sourceId: '', code: value }
  return { sourceId, code }
}
