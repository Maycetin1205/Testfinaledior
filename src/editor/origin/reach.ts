import { blockName } from '../../core/block/blockName'
import { capability } from '../../core/block/capability'
import { listDefaultTitle } from '../../core/block/listBinding'
import { blockType } from '../../core/block/registry'
import type { BlockNode, MaskTree } from '../../core/block/tree'
import {
  captureCarrierInTree,
  changeCarrierInTree,
  selectionGiverInTree,
  selectionSourceIdOf,
  valueSpotsInTree,
} from '../../core/block/treeQuery'
import type { DataSource } from '../../core/data/dataSources'
import type { ResultStep } from '../../core/data/steps/chains'

// One value a place lists: its code or key, its name, the code beside it.
export interface ReachEntry {
  value: string
  name: string
  badge?: string
}

// A source, or the rows of a block, with the fields or columns it holds.
export interface ReachGroup {
  id: string
  name: string
  entries: readonly ReachEntry[]
}

interface FormField {
  blockId: string
  prop: string
  name: string
}

// What a place can read, the same for every place that takes a value; a part
// left out is not offered there.
export interface Reach {
  events?: boolean

  // The columns of this row.
  row?: readonly ReachEntry[]
  helpers?: readonly ReachGroup[]
  document?: ReachGroup
  sources?: readonly DataSource[]
  formFields?: readonly FormField[]

  // The blocks whose chosen row others read.
  givers?: readonly ReachGroup[]
  captures?: readonly ReachGroup[]
  changes?: readonly ReachGroup[]
  steps?: readonly ResultStep[]
}

export const fieldEntries = (source: DataSource | undefined): ReachEntry[] =>
  (source?.fields ?? []).map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code }))

export const sourceGroup = (source: DataSource): ReachGroup =>
  ({ id: source.id, name: source.name, entries: fieldEntries(source) })

export const openDocumentOf = (library: readonly DataSource[]): DataSource | undefined =>
  library.find((s) => s.preset === 'document')

// The columns of a list a step can point at, an untitled one by the title it
// would get.
export function columnEntries(node: BlockNode): ReachEntry[] {
  const binding = capability(blockType(node.type), 'list')?.binding
  const keyOf = binding?.keyOf
  if (!binding || keyOf === undefined) return []
  return binding.entries(node.values[binding.prop]).flatMap((entry, i) => {
    const key = keyOf(entry)
    if (key === '') return []
    const title = binding.titleOf(entry)
    return [{ value: key, name: title !== '' ? title : listDefaultTitle(binding, i) }]
  })
}

// The form fields of the mask, each by its block's name; a block with
// several spots adds the spot, a name that repeats a number behind it.
export function formFieldsOf(tree: MaskTree, sources: readonly DataSource[]): FormField[] {
  const all = valueSpotsInTree(tree).map(({ node, spot }) => {
    const name = blockName(node, sources)
    const several = (capability(blockType(node.type), 'actionValue')?.spots.length ?? 0) > 1
    return { blockId: node.id, prop: spot.prop, name: several ? `${name} — ${spot.name}` : name }
  })
  return all.map((f) => {
    const same = all.filter((o) => o.name === f.name)
    return same.length > 1 ? { ...f, name: `${f.name} ${same.indexOf(f) + 1}` } : f
  })
}

// A block whose chosen row others read, by its name and its source's, with
// the fields of that source.
export function giverGroup(node: BlockNode, sources: readonly DataSource[]): ReachGroup {
  const source = sources.find((s) => s.id === selectionSourceIdOf(node))
  const name = blockName(node, sources)
  return { id: node.id, name: source ? `${name} (${source.name})` : name, entries: fieldEntries(source) }
}

const rowsGroup = (node: BlockNode, sources: readonly DataSource[]): ReachGroup =>
  ({ id: node.id, name: blockName(node, sources), entries: columnEntries(node) })

// Everything an action of this mask can read.
export function maskReach(tree: MaskTree, sources: readonly DataSource[]): Reach {
  return {
    events: true,
    sources,
    formFields: formFieldsOf(tree, sources),
    givers: selectionGiverInTree(tree).map((node) => giverGroup(node, sources)),
    captures: captureCarrierInTree(tree).map((node) => rowsGroup(node, sources)),
    changes: changeCarrierInTree(tree).map((node) => rowsGroup(node, sources)),
  }
}

// What the value a source fetches can read: a typed value or a field of
// another source.
export function sourceReach(sources: readonly DataSource[], exceptId: string): Reach {
  return { sources: sources.filter((s) => s.id !== exceptId) }
}

// Where a key takes its value from outside the row: a field of the open
// document or the value of a form field. The key of a helper source and the
// pairs of a follow reach the same.
export function outsideReach(
  library: readonly DataSource[],
  formFields: readonly FormField[],
): Pick<Reach, 'document' | 'formFields'> {
  const openDocument = openDocumentOf(library)
  return { ...(openDocument ? { document: sourceGroup(openDocument) } : {}), formFields }
}
