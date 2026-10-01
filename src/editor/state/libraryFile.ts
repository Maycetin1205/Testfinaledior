import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { writeFile } from './fileOnDisk'
import type { EditorStore } from './EditorStore'
import { LIBRARY_SCHEMA_VERSION, liftLibrary } from './librarySchema'

const LIBRARY_FILE_KIND = 'aufbau-editor-bibliothek'

const LIBRARY_FILE_VERSION = 2

interface LibraryContent {
  dataSources: DataSource[]
  relation: RelationTemplate[]
}

type LibraryResult =
  | { ok: true; content: LibraryContent }
  | { ok: false }

export function packLibrary(content: LibraryContent): string {
  return JSON.stringify(
    {
      kind: LIBRARY_FILE_KIND,
      fileVersion: LIBRARY_FILE_VERSION,
      schemaVersion: LIBRARY_SCHEMA_VERSION,
      dataSources: content.dataSources,
      relation: content.relation,
    },
    null,
    2,
  ) + '\n'
}

export function saveLibraryAsFile(editor: EditorStore): void {
  const today = new Date().toISOString().slice(0, 10)
  void writeFile(
    editor.libraryOnDisk,
    `aufbau-bibliothek-${today}.json`,
    packLibrary({
      dataSources: [...editor.dataSources.list],
      relation: [...editor.relation.list],
    }),
  )
}

export function packLibraryFrom(text: string): LibraryResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false }
  // A newer editor wrote it: what this one cannot read of it would be gone
  // with the next save.
  const version = (raw as Record<string, unknown>).schemaVersion
  if (typeof version === 'number' && version > LIBRARY_SCHEMA_VERSION) return { ok: false }
  const o = liftLibrary(raw as Record<string, unknown>)

  return {
    ok: true,
    content: {
      dataSources: checkDataSources(o.dataSources),
      relation: checkRelationTemplates(o.relation),
    },
  }
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, w: unknown) => {
    if (!w || typeof w !== 'object' || Array.isArray(w)) return w
    return Object.fromEntries(Object.entries(w).sort(([a], [b]) => (a < b ? -1 : 1)))
  })
}

export function addOn<T extends { id: string }>(
  old: readonly T[],
  fromFile: readonly T[],
): { list: readonly T[]; added: number; replaced: number } {
  const list = [...old]
  let added = 0
  let replaced = 0
  for (const entry of fromFile) {
    const at = list.findIndex((e) => e.id === entry.id)
    if (at < 0) {
      list.push(entry)
      added++
      continue
    }
    if (stable(list[at]) === stable(entry)) continue
    list[at] = entry
    replaced++
  }
  return { list: added + replaced === 0 ? old : list, added, replaced }
}

// What a mask file brings that the customer file lacks. An entry the customer
// file holds already stays as it is: the copy in the mask may be older.
export function missingOn<T extends { id: string }>(
  old: readonly T[],
  fromMask: readonly T[],
): readonly T[] {
  const known = new Set(old.map((e) => e.id))
  const missing = fromMask.filter((e) => !known.has(e.id))
  return missing.length === 0 ? old : [...old, ...missing]
}

export async function loadLibraryFromFile(editor: EditorStore, file: File): Promise<void> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return
  }
  const result = packLibraryFrom(text)
  if (!result.ok) return

  const sources = addOn(editor.dataSources.list, result.content.dataSources)
  const relation = addOn(editor.relation.list, result.content.relation)
  if (sources.list === editor.dataSources.list && relation.list === editor.relation.list) return

  editor.transaction(() => {
    if (sources.list !== editor.dataSources.list) editor.dataSources.replaceAll(sources.list)
    if (relation.list !== editor.relation.list) editor.relation.replaceAll(relation.list)
  })
}
