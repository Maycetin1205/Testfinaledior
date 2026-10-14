import { recordNumberOf, type DataSource, type RuntimeSource } from '../../core/data/dataSources'
import type { Samples } from '../../runtime/previewHost'
import { PROBEDATEN } from './probedaten'

// A source of the editor as its host hands it to the blocks. The samples lie
// ready for every source, as if pushed with the document; nothing is fetched.
function runtimeSourceOf(source: DataSource): RuntimeSource {
  return {
    id: source.id,
    name: source.name,
    tableId: source.tableId,
    recordField: recordNumberOf(source),
    delivery: { kind: 'push', openRecord: false },
  }
}

// The samples of the editor's sources: the rows of the table each names.
// Only the editor knows them; the export never does.
export function editorSamples(sources: () => readonly DataSource[]): Samples {
  return {
    sources: () => sources().map(runtimeSourceOf),
    rows: (source) => PROBEDATEN[source.tableId.trim().toUpperCase()] ?? [],
  }
}
