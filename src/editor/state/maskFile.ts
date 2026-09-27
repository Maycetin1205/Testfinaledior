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

// Version 4 carries the data sources and relations the mask uses, so the mask
// loads from its own file; the customer file stays the catalog to pick from.
// Version 3 kept only their keys, version 2 the whole customer file.
const MASK_FILE_VERSION = 4

export interface MaskContent {
  tree: MaskTree
  dataSources: DataSource[]
  relation: RelationTemplate[]
}

type UnpackResult =
  | { ok: true; content: MaskContent }
  | { ok: false }

export function packMask(
  tree: MaskTree,
  sources: readonly DataSource[],
  relation: readonly RelationTemplate[],
): string {
  const used = collectDataSources(tree, sources)
  return JSON.stringify(
    {
      kind: MASK_FILE_KIND,
      fileVersion: MASK_FILE_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tree,
      dataSources: used,
      relation: collectRelation(tree, relation, used),
    },
    null,
    2,
  ) + '\n'
}

function maskFileName(): string {
  return `aufbau-maske-${new Date().toISOString().slice(0, 10)}.json`
}

export function saveMaskAsFile(editor: EditorStore): void {
  void writeFile(
    editor.maskOnDisk,
    maskFileName(),
    packMask(editor.tree, editor.dataSources.list, editor.relation.list),
  )
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

  // A file of version 3 carries no source; its keys find them in the customer file.
  return {
    ok: true,
    content: {
      tree: state.tree,
      dataSources: checkDataSources(o.dataSources),
      relation: checkRelationTemplates(o.relation),
    },
  }
}
