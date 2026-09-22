import { ROOT_ID, type MaskTree } from '../../core/block/tree'
import { checkDataSources, type DataSource } from '../../core/data/dataSources'
import {
  AREA_SOURCES,
  AREA_RELATION,
  type LoadProblem,
} from '../../core/data/loadProblem'
import { checkRelationTemplates, type RelationTemplate } from '../../core/data/relations'
import { downloadFile } from './fileDownload'
import {
  LIBRARY_FILE_KIND,
  libraryCheck,
  problemText,
} from './libraryFile'
import type { EditorStore } from './EditorStore'
import { checkTreeState } from './loadCheck'
import { messages } from './messages'
import { reportDropped } from './maskStorage'
import { CURRENT_SCHEMA_VERSION, liftState } from './maskSchema'

const MASK_FILE_KIND = 'aufbau-editor-maske'

const MASK_FILE_VERSION = 2

export interface MaskContent {
  tree: MaskTree
  dataSources: DataSource[]
  relation: RelationTemplate[]
}

export type UnpackResult =
  | {
    ok: true
    content: MaskContent
  }
  | { ok: false; base: string; problems: readonly LoadProblem[] }

function damagedRecord(problems: readonly LoadProblem[]): string {
  const first = problems[0]?.base ?? 'der Masken-Aufbau ist unlesbar'
  return `Die Datei ist beschädigt: ${first}. Sie wird nicht geladen, damit `
    + 'nicht unbemerkt Teile deiner Maske verlorengehen.'
}

function packMask(content: MaskContent): string {
  return JSON.stringify(
    {
      kind: MASK_FILE_KIND,
      fileVersion: MASK_FILE_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tree: content.tree,
      dataSources: content.dataSources,
      relation: content.relation,
    },
    null,
    2,
  ) + '\n'
}

export function saveMaskAsFile(editor: EditorStore): void {
  const text = packMask({
    tree: editor.tree,
    dataSources: [...editor.dataSources.list],
    relation: [...editor.relation.list],
  })
  const today = new Date().toISOString().slice(0, 10)
  downloadFile(`aufbau-maske-${today}.json`, text, 'application/json')
}

export async function loadMaskFromFile(editor: EditorStore, file: File): Promise<void> {
  let text: string
  try {
    text = await file.text()
  } catch {
    messages.report('Die Datei konnte nicht gelesen werden.')
    return
  }
  const result = packMaskFrom(text)
  if (!result.ok) {
    messages.report(problemText(result.base, result.problems))
    return
  }
  editor.replaceMask(result.content)
}

function packMaskFrom(text: string): UnpackResult {
  try {
    return unpack(text)
  } catch {
    return rejected('Die Datei konnte nicht verarbeitet werden — sie ist vermutlich beschädigt.')
  }
}

function rejected(base: string): UnpackResult {
  return { ok: false, base, problems: [] }
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
      'Das ist eine Bibliotheksdatei (nur Datenquellen und Relationen, ohne '
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
  if (fileVersion !== MASK_FILE_VERSION) {
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
  reportDropped(state.dropped)
  const tree = state.tree

  const sources = libraryCheck(o.dataSources, checkDataSources, AREA_SOURCES)
  if (!sources.ok) return { ok: false, base: sources.base, problems: sources.problems }
  const relation = libraryCheck(o.relation, checkRelationTemplates, AREA_RELATION)
  if (!relation.ok) return { ok: false, base: relation.base, problems: relation.problems }

  return {
    ok: true,
    content: {
      tree: tree.tree,
      dataSources: sources.list,
      relation: relation.list,
    },
  }
}
