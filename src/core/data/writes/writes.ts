import type { WriteAdapter } from './writeAdapter'
import { noWrite, type NoWrite } from './none'
import { putRelation, type PutRelationWrite } from './putRelation'

export type Write = NoWrite | PutRelationWrite

export type WriteKind = Write['kind']

const WRITE_ADAPTERS: { [K in WriteKind]: WriteAdapter<K> } = {
  none: noWrite,
  putRelation,
}

const WRITE_KINDS: readonly WriteKind[] = Object.values(WRITE_ADAPTERS).map((a) => a.kind)

export function writeAdapter(kind: WriteKind): WriteAdapter<WriteKind> {
  return WRITE_ADAPTERS[kind]
}

export function isWriteKind(kind: string): kind is WriteKind {
  return (WRITE_KINDS as readonly string[]).includes(kind)
}

export function recordFieldOf(write: Write): string {
  return writeAdapter(write.kind).recordField(write)
}
