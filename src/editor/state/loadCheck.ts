import type { PropertyValue } from '../../core/block/property'
import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { DOCUMENT_FRAME_PROP } from '../../core/block/documentFrame'
import { MASK_NAME_PROP } from '../../core/block/maskName'
import { chainsClean, withoutOldParameterKey } from '../../core/data/actions'
import { AREA_LAYOUT, type LoadProblem } from '../../core/data/loadProblem'
import { CURRENT_SCHEMA_VERSION, withoutDropped, schemaReadable } from './maskSchema'
import { topologieProblems } from './topology'
import { valuesClean } from '../../core/block/treeOps'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export type LoadOutcome =
  | { kind: 'ok'; tree: { tree: MaskTree; selectedId: string | null }; dropped: string[] }
  | { kind: 'rejected'; cause: 'version' | 'unreadable' | 'loss'; problems: LoadProblem[] }

export function checkTreeState(raw: {
  schemaVersion: number
  tree?: unknown
  selectedId?: unknown
}): LoadOutcome {
  if (!schemaReadable(raw.schemaVersion)) {
    return { kind: 'rejected', cause: 'version', problems: [{
      area: AREA_LAYOUT, spot: '',
      base: `Maskenformat ${raw.schemaVersion} wird nicht unterstützt. Dieser Editor verwendet Format ${CURRENT_SCHEMA_VERSION}.`,
    }] }
  }
  if (!isPlainObject(raw.tree) || !isPlainObject(raw.tree[ROOT_ID])) {
    return { kind: 'rejected', cause: 'unreadable', problems: [] }
  }
  const cleaned = withoutDropped(raw.tree)
  const tree: MaskTree = Object.create(null) as MaskTree
  const problems: LoadProblem[] = []
  const find = (spot: string, base: string): void => { problems.push({ area: AREA_LAYOUT, spot, base }) }
  for (const [id, node] of Object.entries(cleaned.tree)) {
    if (!isPlainObject(node) || node.id !== id || typeof node.type !== 'string'
      || !isPlainObject(node.values) || !Array.isArray(node.childIds)
      || !node.childIds.every((kind): kind is string => typeof kind === 'string')
      || !(node.parentId === null || typeof node.parentId === 'string')) {
      find(id, `der Baustein „${id}“ ist unlesbar`)
      continue
    }
    const def = blockType(node.type)
    if (id !== ROOT_ID && !def) {
      find(id, `der Bausteintyp „${node.type}“ wird nicht unterstützt`)
      continue
    }
    if (id === ROOT_ID && (node.type !== ROOT_TYPE || node.parentId !== null)) {
      find(id, 'die Wurzel des Masken-Aufbaus ist ungültig')
    }
    const read = id === ROOT_ID
      ? {
          values: Object.fromEntries(Object.entries(node.values).filter(([key, value]) =>
            [MASK_NAME_PROP, DOCUMENT_FRAME_PROP].includes(key) && typeof value === 'string')) as Record<string, PropertyValue>,
          problems: [],
        }
      : valuesClean(node.type, node.values)
    const props = read.values
    const spot = id === ROOT_ID ? 'an der Maske selbst' : `am Baustein „${id}“`
    const events = chainsClean(node.chains, (capability(def, 'events')?.list ?? []).map((event) => event.key))
    for (const problem of read.problems) {
      find(id, `${spot}: „${problem.property}“ — ${problem.reason}`)
    }
    if (read.problems.length === 0 && !noLoss(node.values, props)) {
      find(id, `${spot} stimmt eine Angabe nicht: ${firstDeviation(node.values, props)}`)
    }
    if (!noLoss(withoutOldParameterKey(node.chains), events)) {
      find(id, `eine Aktion am Baustein „${id}“ ist unlesbar`)
    }
    tree[id] = { id, type: node.type, parentId: node.parentId, values: props,
      childIds: [...node.childIds], ...(events ? { chains: events } : {}) }
  }
  if (problems.length === 0) problems.push(...topologieProblems(tree))
  if (problems.length > 0) return { kind: 'rejected', cause: 'loss', problems }
  return { kind: 'ok', dropped: cleaned.dropped, tree: { tree, selectedId:
    typeof raw.selectedId === 'string' && raw.selectedId !== ROOT_ID && tree[raw.selectedId] ? raw.selectedId : null,
  } }
}

export function noLoss(raw: unknown, clean: unknown): boolean {
  if (raw === clean) return true
  if (Array.isArray(raw) || Array.isArray(clean)) {
    if (!Array.isArray(raw) || !Array.isArray(clean) || raw.length !== clean.length) return false
    return raw.every((x, i) => noLoss(x, clean[i]))
  }
  if (typeof raw !== 'object' || typeof clean !== 'object' || raw === null || clean === null) return false
  const a = raw as Record<string, unknown>
  const b = clean as Record<string, unknown>
  return Object.keys(a)
    .filter((k) => a[k] !== undefined)
    .every((k) => Object.prototype.hasOwnProperty.call(b, k) && noLoss(a[k], b[k]))
}

export function firstDeviation(raw: unknown, clean: unknown): string {
  if (Array.isArray(raw)) {
    if (!Array.isArray(clean) || raw.length !== clean.length) return 'die Anzahl der Einträge'
    for (let i = 0; i < raw.length; i++) {
      if (noLoss(raw[i], clean[i])) continue
      const e = raw[i] as Record<string, unknown> | null
      const name = e && typeof e.name === 'string' ? `„${e.name}"` : `Eintrag ${i + 1}`
      return `${name} → ${firstDeviation(raw[i], clean[i])}`
    }
    return ''
  }
  if (raw && typeof raw === 'object' && clean && typeof clean === 'object') {
    const a = raw as Record<string, unknown>
    const b = clean as Record<string, unknown>
    for (const k of Object.keys(a)) {
      if (a[k] === undefined) continue
      if (!Object.prototype.hasOwnProperty.call(b, k)) return `„${k}" (unbekannte Angabe)`
      if (!noLoss(a[k], b[k])) return `„${k}" → ${firstDeviation(a[k], b[k])}`
    }
    return ''
  }
  return `${JSON.stringify(raw)} wird als ${JSON.stringify(clean)} gelesen`
}
