import type { Write, WriteKind } from './writes'

// An intersection instead of Extract keeps an adapter of one kind assignable to
// the adapter of all kinds.
export type WriteOf<K extends WriteKind> = Write & { kind: K }

// How the mask writes back what the operator changed in the rows of a source.
export interface WriteAdapter<K extends WriteKind> {
  kind: K
  read(raw: Readonly<Record<string, unknown>>): WriteOf<K> | null
  // The field that holds the record number of a row, '' when rows have none.
  recordField(write: WriteOf<K>): string
}
