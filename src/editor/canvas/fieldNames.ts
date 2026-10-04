import { splitBinding } from '../../core/block/blockType'
import { sourcesKey } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import type { PickerGroup } from './FieldPicker'

// The sources in reach of a block as the groups of a field picker: the
// block's own source first, under an empty id, the helper sources after it.
export function pickerGroups(sources: readonly SourceInReach[]): PickerGroup[] {
  return sources.map((q, i) => (i === 0
    ? {
        sourceId: '',
        name: q.source.name,
        badge: sourcesKey(q.source),
        fields: q.source.fields,
      }
    : {
        sourceId: q.source.id,
        name: q.source.name,
        badge: sourcesKey(q.source),
        fields: q.source.fields,
      }))
}

function sourceOf(value: string, sources: readonly SourceInReach[]): SourceInReach['source'] | undefined {
  const { sourceId } = splitBinding(value)
  return sourceId === ''
    ? sources[0]?.source
    : sources.find((q) => q.source.id === sourceId)?.source
}

// The plain name of a bound field, '' when its source does not have it.
export function plainNameOf(value: string, sources: readonly SourceInReach[]): string {
  const { code } = splitBinding(value)
  return sourceOf(value, sources)?.fields.find((f) => f.code === code)?.name ?? ''
}

export function sourceNameOf(value: string, sources: readonly SourceInReach[]): string {
  return sourceOf(value, sources)?.name ?? ''
}
