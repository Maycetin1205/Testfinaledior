import { isUnread } from '../../core/unread'
import type { EditorStore } from './EditorStore'
import { allCopies, type Backup } from './backup'
import {
  libraryInMask,
  readState,
  STORAGE_KEY,
  type StoredLibrary,
  type StoredMask,
} from './maskStorage'

export interface CopyState {
  key: string
  time: Date | null

  size: number

  blocks: number | null
  dataSources: number | null
  relation: number | null

  readable: boolean
}

type Count = Pick<CopyState, 'blocks' | 'dataSources' | 'relation' | 'readable'>

const UNREADABLE: Count = {
  blocks: null, dataSources: null, relation: null, readable: false,
}

function countsOf(text: string): Count {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return UNREADABLE }
  // A copy from before the customer file still carries its sources.
  if (!isUnread<StoredMask & StoredLibrary>(raw)) return UNREADABLE
  const tree = raw.tree
  return {
    readable: true,

    blocks: tree !== null && typeof tree === 'object' && !Array.isArray(tree)
      ? Math.max(0, Object.keys(tree).length - 1)
      : null,
    dataSources: Array.isArray(raw.dataSources) ? raw.dataSources.length : null,
    relation: Array.isArray(raw.relation) ? raw.relation.length : null,
  }
}

function toState(copy: Backup): CopyState {
  return {
    key: copy.key,
    time: copy.time,
    size: copy.raw.length,
    ...countsOf(copy.raw),
  }
}

export function copiesToChoice(): CopyState[] {
  return allCopies(STORAGE_KEY).map(toState)
}

function two(number: number): string {
  return String(number).padStart(2, '0')
}

export function timeText(copy: CopyState): string {
  const time = copy.time
  if (time === null) return 'Zeitpunkt unbekannt'
  return `${two(time.getDate())}.${two(time.getMonth() + 1)}.${time.getFullYear()}, `
    + `${two(time.getHours())}:${two(time.getMinutes())}`
}

function count(howMany: number | null, one: string, many: string): string {
  if (howMany === null) return `— ${many}`
  return `${howMany} ${howMany === 1 ? one : many}`
}

function numbersRecord(
  blocks: number | null, dataSources: number | null, relation: number | null,
): string {
  return [
    count(blocks, 'Baustein', 'Bausteine'),
    count(dataSources, 'Datenquelle', 'Datenquellen'),
    count(relation, 'Relation', 'Relationen'),
  ].join(', ')
}

export function contentText(copy: CopyState): string {
  if (!copy.readable) {
    return `Inhalt unlesbar — ${Math.max(1, Math.round(copy.size / 1024))} kB`
  }
  return numbersRecord(copy.blocks, copy.dataSources, copy.relation)
}

export function restoreCopy(editor: EditorStore, key: string): void {
  const copy = allCopies(STORAGE_KEY).find((k) => k.key === key)
  if (copy === undefined) return
  const state = readState(copy.raw, STORAGE_KEY)
  if (state === null) return
  const carried = libraryInMask(copy.raw)
  editor.replaceMask({
    tree: state.tree,
    dataSources: [...carried.dataSources],
    relation: [...carried.relation],
    sourceIds: state.sourceIds,
    relationIds: state.relationIds,
  })
}
