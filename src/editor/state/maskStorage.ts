import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { emptyTree } from '../../core/block/treeOps'
import type { DataSource } from '../../core/data/dataSources'
import type { RelationTemplate } from '../../core/data/relations'
import { packLibrary, packLibraryFrom } from './libraryFile'
import { checkTreeState } from './checkTreeState'
import { CURRENT_SCHEMA_VERSION, liftState } from './maskSchema'

// One key for the mask, one for the customer file. Nothing is matched up
// between them: the blocks name the keys of their sources, the customer file
// holds the sources themselves.
const STORAGE_KEY = 'aufbau_editor_mask'

const LIBRARY_KEY = 'aufbau_editor_library'

// The customer file moves from the key it had before 23.09.: data sources
// always come along.
const FORMER_LIBRARY_KEY = 'aufbau_editor_datencenter'
export const SAVE_DEBOUNCE_MS = 500

export interface StoredMask {
  tree: MaskTree
  selectedId: string | null
  activePageId: string
}

export interface StoredLibrary {
  dataSources: readonly DataSource[]
  relation: readonly RelationTemplate[]
}

function read(key: string, formerKey?: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return formerKey === undefined ? localStorage.getItem(key) : readMoved(key, formerKey)
  } catch {
    return null
  }
}

export function readMoved(key: string, formerKey: string): string | null {
  const text = localStorage.getItem(key)
  if (text !== null) return text
  const former = localStorage.getItem(formerKey)
  if (former === null) return null
  write(key, former)
  if (localStorage.getItem(key) === former) localStorage.removeItem(formerKey)
  return former
}

function write(key: string, text: string): void {
  try {
    localStorage.setItem(key, text)
  } catch {
    // Browser storage can be blocked; not remembering is no reason to fail.
  }
}

export function loadLibraryFromStorage(): StoredLibrary {
  const raw = read(LIBRARY_KEY, FORMER_LIBRARY_KEY)
  if (raw === null) return { dataSources: [], relation: [] }
  const result = packLibraryFrom(raw)
  return result.ok ? result.content : { dataSources: [], relation: [] }
}

export function loadFromStorage(): StoredMask | null {
  const raw = read(STORAGE_KEY)
  return raw === null ? null : readState(raw)
}

function readState(raw: string): StoredMask | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  try {
    const state = liftState(parsed)
    if (state === null) return null
    const tree = checkTreeState({ tree: state.tree, selectedId: state.selectedId })
    if (tree === null) return null
    return {
      ...tree,
      activePageId: typeof state.activePageId === 'string' ? state.activePageId : ROOT_ID,
    }
  } catch {
    return null
  }
}

export function emptyMask(): StoredMask {
  return {
    tree: emptyTree(),
    selectedId: null,
    activePageId: ROOT_ID,
  }
}

export function persistMask(mask: StoredMask): void {
  write(STORAGE_KEY, JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tree: mask.tree,
    selectedId: mask.selectedId,
    activePageId: mask.activePageId,
  }))
}

export function persistLibrary(library: StoredLibrary): string {
  const text = packLibrary({
    dataSources: [...library.dataSources],
    relation: [...library.relation],
  })
  write(LIBRARY_KEY, text)
  return text
}
