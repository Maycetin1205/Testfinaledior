import { EXPORT_TARGET_PROP } from '../../core/block/exportTarget'
import { MASK_NAME_PROP, maskNameOf } from '../../core/block/maskName'
import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { collectDataSources } from '../../export/usedSources'
import { collectRelation } from '../../export/usedRelations'
import { writeFile } from './fileOnDisk'
import { canPickFolder, reasonOf } from './folderOnDisk'
import type { EditorStore } from './EditorStore'
import { checkTreeState } from './checkTreeState'
import { LIBRARY_FILE_KIND } from './libraryFile'
import type { MaskEntry } from './maskFolder'
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

// A file in the folder of masks and where in the folder it lies.
export interface MaskFileAt {
  file: FileSystemFileHandle
  path: string
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

function packed(editor: EditorStore, tree: MaskTree = editor.tree): string {
  return packMask(tree, editor.dataSources.list, editor.relation.list)
}

// The mask without some values of its root, as a copy that is not this mask.
function treeWithout(tree: MaskTree, names: readonly string[]): MaskTree {
  const root = tree[ROOT_ID]
  if (!root) return tree
  const values = Object.fromEntries(Object.entries(root.values).filter(([name]) => !names.includes(name)))
  return { ...tree, [ROOT_ID]: { ...root, values } }
}

// „Speichern": into the mask's own file; a mask without one gets a new file
// at the top of the folder of masks, which is picked the first time. A
// browser that cannot open a folder picks a file or downloads, as before.
// The button wears a check when it is done; what fails, one notice says.
export async function saveMask(editor: EditorStore): Promise<void> {
  const disk = editor.maskOnDisk
  if (!disk.attached && !canPickFolder()) {
    await writeFile(disk, maskFileName(), packed(editor))
    return
  }
  try {
    if (!disk.attached && !(await editor.folderReady())) return
  } catch (error) {
    editor.showNotice({ title: 'Nicht gespeichert', lead: `Der Ordner der Masken ließ sich nicht öffnen: ${reasonOf(error)}.` })
    return
  }
  const text = packed(editor)
  try {
    if (disk.attached) {
      await disk.write(text)
    } else {
      editor.keepIn(await editor.maskFolder.saveNew(maskNameOf(editor.tree), text), text)
    }
  } catch (error) {
    editor.showNotice({
      title: 'Nicht gespeichert',
      lead: (disk.attached
        ? `„${disk.name}“ ließ sich nicht schreiben: ${reasonOf(error)}.`
        : `Im Ordner „${editor.maskFolder.name}“ ließ sich keine Datei anlegen: ${reasonOf(error)}.`)
        + ' Die Maske bleibt im Browser; „Speichern“ versucht es noch einmal.',
    })
    return
  }
  editor.markDone('saved')
}

// „Als Vorlage sichern": a copy of the mask in the folder „Vorlagen“, under
// its name, without the folder its export goes to on this machine.
export async function saveAsTemplate(editor: EditorStore): Promise<void> {
  try {
    if (!(await editor.folderReady())) return
    await editor.maskFolder.saveTemplate(
      maskNameOf(editor.tree),
      packed(editor, treeWithout(editor.tree, [EXPORT_TARGET_PROP])),
    )
  } catch (error) {
    editor.showNotice({ title: 'Nicht als Vorlage gesichert', lead: `${reasonOf(error)}.` })
    return
  }
  editor.markDone('template')
}

async function readEntry(entry: MaskEntry): Promise<UnpackResult> {
  let text: string
  try {
    text = await (await entry.file.getFile()).text()
  } catch {
    return { ok: false, why: 'ließ sich nicht lesen.' }
  }
  return packMaskFrom(text)
}

// A mask of the folder on the canvas, with its file; why not, else null.
export async function openMaskFile(editor: EditorStore, entry: MaskEntry): Promise<string | null> {
  const result = await readEntry(entry)
  if (!result.ok) return result.why
  editor.replaceMask(result.content, { file: entry.file, path: entry.path })
  return null
}

// „Neu aus Vorlage": a copy of the template without a name, without a file
// and without the folder of an export; the first „Speichern" gives it a file.
export async function newMaskFrom(editor: EditorStore, entry: MaskEntry): Promise<string | null> {
  const result = await readEntry(entry)
  if (!result.ok) return result.why
  editor.replaceMask({
    ...result.content,
    tree: treeWithout(result.content.tree, [MASK_NAME_PROP, EXPORT_TARGET_PROP]),
  })
  return null
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

export function packMaskFrom(text: string): UnpackResult {
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
