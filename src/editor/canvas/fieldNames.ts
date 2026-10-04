import { sourcesKey } from '../../core/data/dataSources'
import { fieldInReachOf, sourceInReachOf, type SourceInReach } from '../../core/data/extraSources'
import type { PickerGroup } from './FieldPicker'

// The sources in reach of a block as the groups of a field picker: the
// block's own source first, under an empty id, the helper sources after it.
export function pickerGroups(sources: readonly SourceInReach[]): PickerGroup[] {
  return sources.map((q, i) => ({
    sourceId: i === 0 ? '' : q.source.id,
    name: q.source.name,
    badge: sourcesKey(q.source),
    fields: q.source.fields,
  }))
}

// The plain name of a bound field, '' when its source does not have it.
export function plainNameOf(value: string, sources: readonly SourceInReach[]): string {
  return fieldInReachOf(value, sources)?.name ?? ''
}

export function sourceNameOf(value: string, sources: readonly SourceInReach[]): string {
  return sourceInReachOf(value, sources)?.name ?? ''
}
