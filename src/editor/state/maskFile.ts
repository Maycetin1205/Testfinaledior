import type { MaskTree } from '../../core/block/tree'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { collectDataSources } from '../../export/usedSources'
import { collectRelation } from '../../export/usedRelations'
import { writeFile } from './fileOnDisk'
import type { EditorStore } from './EditorStore'
import { checkTreeState } from './checkTreeState'
import { CURRENT_SCHEMA_VERSION, liftState } from './maskSchema'

const MASK_FILE_KIND = 'aufbau-editor-maske'

// Version 3 keeps only the keys of the data sources and relations the mask
// uses; the sources themselves live in the customer file.
const MASK_FILE_VERSION = 3

export interface MaskContent {
  tree: MaskTree

  // What an older file still carried inside the mask.
  dataSources: DataSource[]
  relation: RelationTemplate[]

  sourceIds: readonly string[]
  relationIds: readonly string[]
}

type UnpackResult =
  | { ok: true; content: MaskContent }
  | { ok: false }

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

function packMask(editor: EditorStore): string {
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

function packMaskFrom(text: string): UnpackResult {
  try {
    return unpack(text)
  } catch {
    return { ok: false }
  }
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
    return { ok: false }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false }
  const o = liftState(raw) as Record<string, unknown>

  const state = checkTreeState({ tree: o.tree })
  if (state === null) return { ok: false }

  // Only an older file carries its sources; they move into the customer file.
  const fileVersion = typeof o.fileVersion === 'number' ? o.fileVersion : 0
  const embedded = fileVersion < MASK_FILE_VERSION
  const sources = embedded ? checkDataSources(o.dataSources) : []
  const relation = embedded ? checkRelationTemplates(o.relation) : []

  return {
    ok: true,
    content: {
      tree: state.tree,
      dataSources: sources,
      relation,
      sourceIds: embedded ? sources.map((s) => s.id) : keysOf(o.sourceIds),
      relationIds: embedded ? relation.map((r) => r.id) : keysOf(o.relationIds),
    },
  }
}
