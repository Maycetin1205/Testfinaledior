import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import {
  AREA_SOURCES,
  AREA_RELATION,
  withArea,
  type EntryProblem,
  type LoadProblem,
} from '../../core/data/loadProblem'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { downloadFile } from './fileDownload'
import type { EditorStore } from './EditorStore'
import { firstDeviation, noLoss } from './loadCheck'
import { liftKey, liftLibraries } from './maskSchema'
import { messages } from './messages'

export const LIBRARY_FILE_KIND = 'aufbau-editor-bibliothek'

const LIBRARY_FILE_VERSION = 2

export interface LibraryContent {
  dataSources: DataSource[]
  relation: RelationTemplate[]
}

export type LibraryResult =
  | { ok: true; content: LibraryContent }
  | { ok: false; base: string; problems: readonly LoadProblem[] }

export function libraryCheck<T>(
  raw: unknown,
  check: (raw: unknown) => { list: T[]; problems: EntryProblem[] },
  plainName: string,
): { ok: true; list: T[] } | { ok: false; base: string; problems: LoadProblem[] } {
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      base: `Die Datei ist beschädigt: der Abschnitt „${plainName}" fehlt oder ist unlesbar.`,
      problems: [{ area: plainName, spot: '', base: 'der Abschnitt fehlt oder ist unlesbar' }],
    }
  }
  const { list, problems } = check(raw)
  if (!noLoss(raw, list)) {
    const spot = firstDeviation(raw, list)
    return {
      ok: false,
      base: `Die Datei ist beschädigt: im Abschnitt „${plainName}" stimmt eine Angabe nicht: `
        + `${spot}. Sie wird nicht geladen, damit nicht unbemerkt Teile deiner Maske verlorengehen.`,
      problems: problems.length > 0
        ? withArea(plainName, problems)
        : [{ area: plainName, spot: '', base: spot }],
    }
  }
  return { ok: true, list }
}

export function problemText(base: string, problems: readonly LoadProblem[]): string {
  const list = problems.slice(0, 10)
    .map((p) => `• ${p.area}${p.spot === '' ? '' : ` (${p.spot})`}: ${p.base}`)
  const rest = problems.length - list.length
  return [
    base,
    ...(list.length > 0 ? ['', ...list] : []),
    ...(rest > 0 ? [`… und ${rest} weitere.`] : []),
  ].join('\n')
}

export function packLibrary(content: LibraryContent): string {
  return JSON.stringify(
    {
      kind: LIBRARY_FILE_KIND,
      fileVersion: LIBRARY_FILE_VERSION,
      dataSources: content.dataSources,
      relation: content.relation,
    },
    null,
    2,
  ) + '\n'
}

export function saveLibraryAsFile(editor: EditorStore): void {
  const text = packLibrary({
    dataSources: [...editor.dataSources.list],
    relation: [...editor.relation.list],
  })
  const today = new Date().toISOString().slice(0, 10)
  downloadFile(`aufbau-bibliothek-${today}.json`, text, 'application/json')
}

function rejected(base: string): LibraryResult {
  return { ok: false, base, problems: [] }
}

export function packLibraryFrom(text: string): LibraryResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return rejected('Die Datei ist keine gültige JSON-Datei und konnte nicht gelesen werden.')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return rejected('Die Datei enthält keine Bibliothek.')
  }
  const o = liftKey(raw) as Record<string, unknown>
  liftLibraries(o)

  if (o.kind !== LIBRARY_FILE_KIND) {
    return rejected(
      'Das ist keine Bibliotheksdatei des Aufbau-Editors. Eine ganze Maske lädt '
      + '„Maske laden…" in den weiteren Aktionen.',
    )
  }

  const fileVersion = typeof o.fileVersion === 'number' ? o.fileVersion : 0
  if (fileVersion > LIBRARY_FILE_VERSION) {
    return rejected(
      'Diese Datei stammt aus einer neueren Version des Editors und kann hier '
      + 'nicht geladen werden.',
    )
  }
  if (fileVersion < 1) {
    return rejected('Die Datei ist beschädigt: die Formatangabe fehlt.')
  }

  const sources = libraryCheck(
    o.dataSources, checkDataSources, AREA_SOURCES,
  )
  if (!sources.ok) return { ok: false, base: sources.base, problems: sources.problems }
  const relation = libraryCheck(o.relation, checkRelationTemplates, AREA_RELATION)
  if (!relation.ok) return { ok: false, base: relation.base, problems: relation.problems }

  return { ok: true, content: { dataSources: sources.list, relation: relation.list } }
}

function stabil(value: unknown): string {
  return JSON.stringify(value, (_key, w: unknown) => {
    if (!w || typeof w !== 'object' || Array.isArray(w)) return w
    const o = w as Record<string, unknown>
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]))
  })
}

export function addOn<T extends { id: string }>(
  old: readonly T[],
  fromFile: readonly T[],
): { list: readonly T[]; next: number; replaced: number } {
  const list = [...old]
  let next = 0
  let replaced = 0
  for (const entry of fromFile) {
    const at = list.findIndex((e) => e.id === entry.id)
    if (at < 0) {
      list.push(entry)
      next++
      continue
    }
    if (stabil(list[at]) === stabil(entry)) continue
    list[at] = entry
    replaced++
  }
  return { list: next + replaced === 0 ? old : list, next, replaced }
}

function stockRecord(plainName: string, z: { next: number; replaced: number }): string {
  if (z.next === 0 && z.replaced === 0) return `• ${plainName}: unverändert`
  const parts: string[] = []
  if (z.next > 0) parts.push(`${z.next} neu`)
  if (z.replaced > 0) parts.push(`${z.replaced} aktualisiert`)
  return `• ${plainName}: ${parts.join(', ')}`
}

export async function loadLibraryFromFile(editor: EditorStore, file: File): Promise<void> {
  let text: string
  try {
    text = await file.text()
  } catch {
    messages.report('Die Datei konnte nicht gelesen werden.')
    return
  }
  const result = packLibraryFrom(text)
  if (!result.ok) {
    messages.report(problemText(result.base, result.problems))
    return
  }

  const sources = addOn(editor.dataSources.list, result.content.dataSources)
  const relation = addOn(editor.relation.list, result.content.relation)
  if (sources.list === editor.dataSources.list && relation.list === editor.relation.list) {
    messages.report('Alles aus der Bibliotheksdatei war schon da — nichts geändert.', 'hint')
    return
  }

  editor.transaction(() => {
    if (sources.list !== editor.dataSources.list) editor.dataSources.replaceAll(sources.list)
    if (relation.list !== editor.relation.list) editor.relation.replaceAll(relation.list)
  })

  messages.report([
    'Bibliothek geladen.',
    stockRecord(AREA_SOURCES, sources),
    stockRecord(AREA_RELATION, relation),
    'Nichts wurde gelöscht; Strg+Z nimmt das Laden zurück.',
  ].join('\n'), 'hint')
}
