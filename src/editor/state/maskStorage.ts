import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { emptyTree } from '../../core/block/treeOps'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { AREA_SOURCES, AREA_RELATION } from '../../core/data/loadProblem'
import {
  libraryCheck,
  packLibrary,
  packLibraryFrom,
  type LibraryContent,
} from './libraryFile'
import { checkTreeState } from './loadCheck'
import { CURRENT_SCHEMA_VERSION, liftKey, liftState, schemaReadable } from './maskSchema'
import { messages } from './messages'
import {
  copyRecord,
  makeCopyOn,
  reportStorageFailure,
  rememberStorageSuccess,
  saveUnreadable,
} from './backup'

export const STORAGE_KEY = 'aufbau_editor_mvp_v1'

export const LIBRARY_KEY = 'aufbau_editor_datencenter'
export const SAVE_DEBOUNCE_MS = 500

interface MaskLibraries {
  dataSources: readonly DataSource[]
  relation: readonly RelationTemplate[]
  activePageId: string
}
export interface LoadedState extends MaskLibraries {
  tree: MaskTree
  selectedId: string | null
}

export function loadFromStorage(): LoadedState | null {
  let raw: string | null
  try { raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY) }
  catch { messages.report('Die gespeicherte Maske konnte nicht aus dem Browser-Speicher gelesen werden.'); return null }
  return withSavedDataCenter(raw ? readState(raw, STORAGE_KEY) : null)
}

function savedDataCenter(): LibraryContent | null {
  let raw: string | null
  try { raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(LIBRARY_KEY) }
  catch { return null }
  if (!raw) return null
  const result = packLibraryFrom(raw)
  if (!result.ok) return null
  const { dataSources, relation } = result.content
  return dataSources.length === 0 && relation.length === 0 ? null : result.content
}

function withSavedDataCenter(state: LoadedState | null): LoadedState | null {
  if (state && (state.dataSources.length > 0 || state.relation.length > 0)) return state
  const saved = savedDataCenter()
  if (!saved) return state
  messages.report(
    `Das Datencenter kommt aus seiner eigenen Sicherung: ${saved.dataSources.length} `
    + `Datenquelle(n) und ${saved.relation.length} Relation(en).`,
    'hint',
  )
  return {
    tree: state?.tree ?? emptyTree(),
    selectedId: state?.selectedId ?? null,
    dataSources: saved.dataSources,
    relation: saved.relation,
    activePageId: state?.activePageId ?? ROOT_ID,
  }
}

function rescuedLibrary(raw: unknown): LoadedState | null {
  const state = liftKey(raw) as Record<string, unknown>
  const sources = libraryCheck(state.dataSources, checkDataSources, AREA_SOURCES)
  const relation = libraryCheck(state.relation, checkRelationTemplates, AREA_RELATION)
  if (!sources.ok && !relation.ok) return null
  const dataSources = sources.ok ? sources.list : []
  const templates = relation.ok ? relation.list : []
  if (dataSources.length === 0 && templates.length === 0) return null
  messages.report(
    `Das Datencenter ist gerettet: ${dataSources.length} Datenquelle(n) und `
    + `${templates.length} Relation(en) sind geladen. Sichere sie im Datencenter mit `
    + '„Bibliothek speichern" als Datei, dann hängen sie an keiner Maske mehr.',
    'hint',
  )
  return {
    tree: emptyTree(),
    selectedId: null,
    dataSources,
    relation: templates,
    activePageId: ROOT_ID,
  }
}

export function readState(raw: string, storageKey: string): LoadedState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Kein Maskenstand')
  } catch {
    saveUnreadable(storageKey, raw, 'Maske')
    return null
  }
  try {
    const state = liftState(parsed) as Record<string, unknown>
    if (!schemaReadable(state.schemaVersion)) {
      const direction = typeof state.schemaVersion === 'number' && state.schemaVersion > CURRENT_SCHEMA_VERSION
        ? 'einer neueren Version' : 'einem nicht unterstützten Format'
      messages.report(`Die gespeicherte Maske stammt aus ${direction}. Sie wurde nicht geladen. `
        + copyRecord(storageKey, makeCopyOn(storageKey, raw)))
      return rescuedLibrary(parsed)
    }
    const tree = checkTreeState({ schemaVersion: state.schemaVersion, tree: state.tree, selectedId: state.selectedId })
    const sources = libraryCheck(state.dataSources, checkDataSources, AREA_SOURCES)
    const relation = libraryCheck(state.relation, checkRelationTemplates, AREA_RELATION)
    if (tree.kind === 'rejected' || !sources.ok || !relation.ok) {
      const base = tree.kind === 'rejected' ? tree.problems[0]?.base : !sources.ok ? sources.base : !relation.ok ? relation.base : ''
      messages.report(`Die gespeicherte Maske wurde nicht geladen: ${base ?? 'Aufbau unlesbar'}.`)
      saveUnreadable(storageKey, raw, 'Maske')
      return rescuedLibrary(parsed)
    }
    reportDropped(tree.dropped)
    return { ...tree.tree, dataSources: sources.list, relation: relation.list,
      activePageId: typeof state.activePageId === 'string' ? state.activePageId : ROOT_ID }
  } catch {
    saveUnreadable(storageKey, raw, 'Maske')
    return rescuedLibrary(parsed)
  }
}

export function reportDropped(dropped: readonly string[]): void {
  if (dropped.length === 0) return
  const kinds = [...new Set(dropped)].map((t) => `„${t}"`).join(', ')
  messages.report(`${dropped.length} Baustein(e) vom Typ ${kinds} gibt es nicht mehr und wurden weggelassen. Alles andere ist geladen.`)
}

export function persistState(
  tree: MaskTree,
  selectedId: string | null,
  libraries: MaskLibraries,
  dataCenterOfHandChanged = false,
): void {
  saveDataCenter(libraries, dataCenterOfHandChanged)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, tree, selectedId, ...libraries }))
    rememberStorageSuccess(STORAGE_KEY)
  } catch (error) { reportStorageFailure(STORAGE_KEY, 'Maske', error) }
}

function saveDataCenter(libraries: MaskLibraries, ofHandChanged: boolean): void {
  if (!ofHandChanged && savedDataCenter() !== null) return
  try {
    localStorage.setItem(LIBRARY_KEY, packLibrary({
      dataSources: [...libraries.dataSources],
      relation: [...libraries.relation],
    }))
  } catch {
      // Browser storage can be blocked; not remembering is no reason to fail.
    }
}
