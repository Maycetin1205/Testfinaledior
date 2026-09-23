import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import {
  AREA_SOURCES,
  AREA_RELATION,
  type LoadProblem,
} from '../../core/data/loadProblem'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { collectDataSources } from '../../export/usedSources'
import { collectRelation } from '../../export/usedRelations'
import { writeFile } from './fileOnDisk'
import {
  LIBRARY_FILE_KIND,
  libraryCheck,
} from './libraryFile'
import type { EditorStore } from './EditorStore'
import { checkTreeState } from './loadCheck'
import { CURRENT_SCHEMA_VERSION, liftState } from './maskSchema'

const MASK_FILE_KIND = 'aufbau-editor-maske'

// Version 3 keeps only the keys of the data sources and relations the mask
// uses; the sources themselves live in the customer file.
const MASK_FILE_VERSION = 3

const READABLE_FILE_VERSIONS = [2, 3]

export interface MaskContent {
  tree: MaskTree

  // What an older file still carried inside the mask.
  dataSources: DataSource[]
  relation: RelationTemplate[]

  sourceIds: readonly string[]
  relationIds: readonly string[]
}

export type UnpackResult =
  | { ok: true; content: MaskContent }
  | { ok: false; base: string; problems: readonly LoadProblem[] }

function damagedRecord(problems: readonly LoadProblem[]): string {
  const first = problems[0]?.base ?? 'der Masken-Aufbau ist unlesbar'
  return `Die Datei ist beschädigt: ${first}. Sie wird nicht geladen, damit `
    + 'nicht unbemerkt Teile deiner Maske verlorengehen.'
}

export function usedSourceIds(
  tree: MaskTree,
  sources: readonly DataSource[],
): string[] {
  return collectDataSources(tree, sources).map((s) => s.id)
}

export function usedRelationIds(
  tree: MaskTree,
  sources: readonly DataSource[],
  relation: readonly RelationTemplate[],
): string[] {
  return collectRelation(tree, relation, collectDataSources(tree, sources)).map((r) => r.id)
}

export function packMask(editor: EditorStore): string {
  const sources = editor.dataSources.list
  return JSON.stringify(
    {
      kind: MASK_FILE_KIND,
      fileVersion: MASK_FILE_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tree: editor.tree,
      sourceIds: usedSourceIds(editor.tree, sources),
      relationIds: usedRelationIds(editor.tree, sources, editor.relation.list),
    },
    null,
    2,
  ) + '\n'
}

function maskFileName(): string {
  return `aufbau-maske-${new Date().toISOString().slice(0, 10)}.json`
}

export function saveMaskAsFile(editor: EditorStore): void {
  void writeFile(editor.maskOnDisk, maskFileName(), packMask(editor))
}

export async function loadMaskFromFile(editor: EditorStore, file: File): Promise<void> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return
  }
  const result = packMaskFrom(text)
  if (!result.ok) return
  editor.replaceMask(result.content)
}

export function packMaskFrom(text: string): UnpackResult {
  try {
    return unpack(text)
  } catch {
    return rejected('Die Datei konnte nicht verarbeitet werden — sie ist vermutlich beschädigt.')
  }
}

function rejected(base: string): UnpackResult {
  return { ok: false, base, problems: [] }
}

function keysOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && id !== '')
}

function unpack(text: string): UnpackResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return rejected('Die Datei ist keine gültige JSON-Datei und konnte nicht gelesen werden.')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return rejected('Die Datei enthält keine Maske.')
  }
  const o = liftState(raw) as Record<string, unknown>

  if (o.kind === LIBRARY_FILE_KIND) {
    return rejected(
      'Das ist eine Kundendatei (nur Datenquellen und Relationen, ohne '
      + 'Bausteine). Sie wird im Datencenter über „Bibliothek laden…" geladen.',
    )
  }
  if (o.kind !== MASK_FILE_KIND) {
    return rejected(
      'Das ist keine Maskendatei des Aufbau-Editors. (Die exportierten '
      + 'SoftEngine-Dateien lassen sich nicht wieder laden — dafür ist die '
      + 'gespeicherte Maskendatei da.)',
    )
  }

  const fileVersion = typeof o.fileVersion === 'number' ? o.fileVersion : 0
  if (fileVersion > MASK_FILE_VERSION) {
    return rejected(
      'Diese Datei stammt aus einer neueren Version des Editors und kann hier '
      + 'nicht geladen werden.',
    )
  }
  if (!READABLE_FILE_VERSIONS.includes(fileVersion)) {
    return rejected('Dieses Maskendateiformat wird nicht unterstützt.')
  }

  if (typeof o.schemaVersion !== 'number') {
    return rejected('Die Datei ist beschädigt: die Versionsangabe des Aufbaus fehlt.')
  }
  const schemaVersion = o.schemaVersion

  if (!o.tree || typeof o.tree !== 'object' || Array.isArray(o.tree)) {
    return rejected('Die Datei enthält keinen lesbaren Masken-Aufbau.')
  }
  const root = (o.tree as Record<string, unknown>)[ROOT_ID]
  if (!root || typeof root !== 'object' || Array.isArray(root)
    || !Array.isArray((root as Record<string, unknown>).childIds)) {
    return rejected('Die Datei enthält keinen lesbaren Masken-Aufbau.')
  }

  const state = checkTreeState({ schemaVersion, tree: o.tree })
  if (state.kind === 'rejected') {
    if (state.cause === 'version') {
      return {
        ok: false,
        base: 'Dieses Maskenformat wird nicht unterstützt. Die Datei wurde nicht verändert.',
        problems: state.problems,
      }
    }
    if (state.cause === 'unreadable') {
      return rejected('Die Datei enthält keinen lesbaren Masken-Aufbau.')
    }

    return { ok: false, base: damagedRecord(state.problems), problems: state.problems }
  }
  const tree = state.tree

  // Only an older file carries its sources; they move into the customer file.
  const embedded = fileVersion < MASK_FILE_VERSION
  const sources = embedded
    ? libraryCheck(o.dataSources, checkDataSources, AREA_SOURCES)
    : { ok: true as const, list: [] }
  if (!sources.ok) return { ok: false, base: sources.base, problems: sources.problems }
  const relation = embedded
    ? libraryCheck(o.relation, checkRelationTemplates, AREA_RELATION)
    : { ok: true as const, list: [] }
  if (!relation.ok) return { ok: false, base: relation.base, problems: relation.problems }

  return {
    ok: true,
    content: {
      tree: tree.tree,
      dataSources: sources.list,
      relation: relation.list,
      sourceIds: embedded ? sources.list.map((s) => s.id) : keysOf(o.sourceIds),
      relationIds: embedded ? relation.list.map((r) => r.id) : keysOf(o.relationIds),
    },
  }
}
