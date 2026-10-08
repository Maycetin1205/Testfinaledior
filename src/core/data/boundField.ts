import { bindingFields, bindingJoiner, splitBinding } from '../block/binding'
import { fieldOf, type DataField, type DataSource } from './dataSources'
import type { SourceInReach } from './extraSources'

// The source a binding names among those in reach: without an id the block's
// own one, the first.
export function sourceInReachOf(binding: string, sources: readonly SourceInReach[]): DataSource | undefined {
  const { sourceId } = splitBinding(binding)
  return sourceId === ''
    ? sources[0]?.source
    : sources.find((q) => q.source.id === sourceId)?.source
}

// The field a binding names, the one way from a binding to a field's name and
// length; nothing when its source does not have it.
export function boundField(binding: string, sources: readonly SourceInReach[]): DataField | undefined {
  return fieldOf(sourceInReachOf(binding, sources), splitBinding(binding).code)
}

// What a bound spot shows: the names of its fields, joined as the binding
// joins them; a field of a helper source carries the mark. Empty when the
// sources know none of them.
export function boundNames(value: string, sources: readonly SourceInReach[], helperMark = ''): string {
  const names = bindingFields(value).flatMap((binding) => {
    const field = boundField(binding, sources)
    return field ? [field.name + (splitBinding(binding).sourceId === '' ? '' : helperMark)] : []
  })
  return names.join(bindingJoiner(value))
}
