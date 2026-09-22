import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { emptyTree } from '../../core/block/treeOps'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import { packLibrary, packLibraryFrom } from './libraryFile'
import { checkTreeState } from './loadCheck'
import { CURRENT_SCHEMA_VERSION, liftState, schemaReadable } from './maskSchema'
import type { MessageSink } from './messages'
import {
  copyRecord,
  makeCopyOn,
  reportStorageFailure,
  rememberStorageSuccess,
  saveUnreadable,
} from './backup'

// One key for the mask, one for the customer file. Nothing is matched up
// between them: the mask names the keys it uses, the customer file holds the
// sources themselves.
export const STORAGE_KEY = 'aufbau_editor_mvp_v1'

export const LIBRARY_KEY = 'aufbau_editor_datencenter'
export const SAVE_DEBOUNCE_MS = 500

export interface StoredMask {
  tree: MaskTree
  selectedId: string | null
  activePageId: string

  sourceIds: readonly string[]
  relationIds: readonly string[]
}

export interface StoredLibrary {
  dataSources: readonly DataSource[]
  relation: readonly RelationTemplate[]
}

function read(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  } catch {
    return null
  }
}

export function loadLibraryFromStorage(sink: MessageSink): StoredLibrary {
  const raw = read(LIBRARY_KEY)
  if (raw === null) return { dataSources: [], relation: [] }
  const result = packLibraryFrom(raw)
  if (result.ok) return result.content
  sink.report('Die gespeicherte Kundendatei konnte nicht gelesen werden. '
    + copyRecord(LIBRARY_KEY, makeCopyOn(LIBRARY_KEY, raw)))
  return { dataSources: [], relation: [] }
}

function keysOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && id !== '')
}

export function loadFromStorage(sink: MessageSink): StoredMask | null {
  const raw = read(STORAGE_KEY)
  return raw === null ? null : readState(raw, STORAGE_KEY, sink)
}

// A mask saved before the split still carries its sources; they belong in the
// customer file now.
export function carriedLibrary(): StoredLibrary {
  const raw = read(STORAGE_KEY)
  return raw === null ? { dataSources: [], relation: [] } : libraryInMask(raw)
}

export function libraryInMask(raw: string): StoredLibrary {
  const empty: StoredLibrary = { dataSources: [], relation: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return empty
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return empty
  const state = liftState(parsed) as Record<string, unknown>
  if (!Array.isArray(state.dataSources) && !Array.isArray(state.relation)) return empty
  const packed = packLibraryFrom(JSON.stringify({
    kind: 'aufbau-editor-bibliothek',
    fileVersion: 2,
    dataSources: state.dataSources ?? [],
    relation: state.relation ?? [],
  }))
  return packed.ok ? packed.content : empty
}

export function readState(raw: string, storageKey: string, sink: MessageSink): StoredMask | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Kein Maskenstand')
  } catch {
    saveUnreadable(storageKey, raw, 'Maske', sink)
    return null
  }
  try {
    const state = liftState(parsed) as Record<string, unknown>
    if (!schemaReadable(state.schemaVersion)) {
      const direction = typeof state.schemaVersion === 'number' && state.schemaVersion > CURRENT_SCHEMA_VERSION
        ? 'einer neueren Version' : 'einem nicht unterstützten Format'
      sink.report(`Die gespeicherte Maske stammt aus ${direction}. Sie wurde nicht geladen. `
        + copyRecord(storageKey, makeCopyOn(storageKey, raw)))
      return null
    }
    const tree = checkTreeState({ schemaVersion: state.schemaVersion, tree: state.tree, selectedId: state.selectedId })
    if (tree.kind === 'rejected') {
      sink.report('Die gespeicherte Maske wurde nicht geladen: '
        + `${tree.problems[0]?.base ?? 'Aufbau unlesbar'}.`)
      saveUnreadable(storageKey, raw, 'Maske', sink)
      return null
    }
    reportDropped(tree.dropped, sink)
    return {
      ...tree.tree,
      activePageId: typeof state.activePageId === 'string' ? state.activePageId : ROOT_ID,
      sourceIds: keysOf(state.sourceIds),
      relationIds: keysOf(state.relationIds),
    }
  } catch {
    saveUnreadable(storageKey, raw, 'Maske', sink)
    return null
  }
}

export function reportDropped(dropped: readonly string[], sink: MessageSink): void {
  if (dropped.length === 0) return
  const kinds = [...new Set(dropped)].map((t) => `„${t}"`).join(', ')
  sink.report(`${dropped.length} Baustein(e) vom Typ ${kinds} gibt es nicht mehr und wurden weggelassen. Alles andere ist geladen.`)
}

export function emptyMask(): StoredMask {
  return {
    tree: emptyTree(),
    selectedId: null,
    activePageId: ROOT_ID,
    sourceIds: [],
    relationIds: [],
  }
}

export function persistMask(mask: StoredMask, sink: MessageSink): string {
  const text = JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: mask.tree,
    selectedId: mask.selectedId,
    activePageId: mask.activePageId,
    sourceIds: mask.sourceIds,
    relationIds: mask.relationIds,
  })
  try {
    localStorage.setItem(STORAGE_KEY, text)
    rememberStorageSuccess(STORAGE_KEY)
  } catch (error) { reportStorageFailure(STORAGE_KEY, 'Maske', error, sink) }
  return text
}

export function persistLibrary(library: StoredLibrary): string {
  const text = packLibrary({
    dataSources: [...library.dataSources],
    relation: [...library.relation],
  })
  try {
    localStorage.setItem(LIBRARY_KEY, text)
  } catch {
    // Browser storage can be blocked; not remembering is no reason to fail.
  }
  return text
}
