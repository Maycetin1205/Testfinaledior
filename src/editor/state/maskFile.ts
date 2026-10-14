import type { MaskTree } from '../../core/block/tree'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { collectDataSources } from '../../export/usedSources'
import { collectRelation } from '../../export/usedRelations'
import { writeFile } from './fileOnDisk'
import type { EditorStore } from './EditorStore'
import { checkTreeState } from './checkTreeState'
import { LIBRARY_FILE_KIND } from './libraryFile'
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

// Why a file does not load, as the end of a sentence that starts with its name.
type UnpackResult =
  | { ok: true; content: MaskContent }
  | { ok: false; why: string }

const NO_MASK = 'ist keine Maske des Editors.'

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

// Why the file did not load, or null when the mask is on the canvas.
export async function loadMaskFromFile(editor: EditorStore, file: File): Promise<string | null> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return 'ließ sich nicht lesen.'
  }
  const result = packMaskFrom(text)
  if (!result.ok) return result.why
  editor.replaceMask(result.content)
  return null
}

function packMaskFrom(text: string): UnpackResult {
  try {
    return unpack(text)
  } catch (error) {
    return { ok: false, why: `ist beschädigt (${error instanceof Error ? error.message : String(error)}).` }
  }
}

function unpack(text: string): UnpackResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, why: 'ist kein vollständiges JSON und damit keine lesbare Maske.' }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, why: NO_MASK }
  // It has no tree and never loaded; the window "Daten" takes it.
  if ((raw as Record<string, unknown>).kind === LIBRARY_FILE_KIND) {
    return { ok: false, why: 'ist eine Kundendatei mit Quellen und Relationen, keine Maske. '
      + 'Sie wird im Fenster „Daten“ mit „Bibliothek laden“ geladen.' }
  }
  const o = liftState(raw)
  if (o === null) return { ok: false, why: whyNotLifted((raw as Record<string, unknown>).schemaVersion) }

  const state = checkTreeState({ tree: o.tree })
  if (state === null) return { ok: false, why: 'ist beschädigt: der Anfang der Maske fehlt.' }

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

// liftState() reads the steps it knows; the step the file names tells why not.
function whyNotLifted(step: unknown): string {
  if (typeof step !== 'number') return NO_MASK
  if (step > CURRENT_SCHEMA_VERSION) {
    return `kommt aus einer neueren Fassung des Editors (Stufe ${step}, dieser kennt bis ${CURRENT_SCHEMA_VERSION}). `
      + 'Erst den Editor auf den neuesten Stand bringen.'
  }
  return `kommt aus einer zu alten Fassung des Editors (Stufe ${step}), die dieser nicht mehr liest.`
}
