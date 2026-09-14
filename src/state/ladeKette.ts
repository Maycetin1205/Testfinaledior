import { ROOT_ID, ROOT_TYPE, type BlockTree } from '../core/blocks/BlockData'
import { getBlockDefinition } from '../core/blocks/blockRegistry'
import { BELEG_RAHMEN_PROP } from '../core/blocks/belegRahmen'
import { MASKEN_NAME_PROP } from '../core/blocks/maskenName'
import { sanitizeBlockEvents } from '../core/data/aktionen'
import { BEREICH_AUFBAU, type LadeProblem } from '../core/data/ladeProblem'
import { CURRENT_SCHEMA_VERSION, hebeAufAktuell, schemaLesbar } from './maskenSchema'
import { topologieProbleme } from './topologie'
import { normalizeProps } from './treeOps'

function objekt(wert: unknown): wert is Record<string, unknown> {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert)
}

export type LadeAusgang =
  | { art: 'ok'; baum: { tree: BlockTree; selectedId: string | null } }
  | { art: 'abgelehnt'; ursache: 'version' | 'unlesbar' | 'verlust'; probleme: LadeProblem[] }

export function pruefeBaumStand(roh: {
  schemaVersion: number
  tree?: unknown
  selectedId?: unknown
}): LadeAusgang {
  if (!schemaLesbar(roh.schemaVersion)) {
    return { art: 'abgelehnt', ursache: 'version', probleme: [{
      bereich: BEREICH_AUFBAU, stelle: '',
      grund: `Maskenformat ${roh.schemaVersion} wird nicht unterstützt. Dieser Editor verwendet Format ${CURRENT_SCHEMA_VERSION}.`,
    }] }
  }
  if (!objekt(roh.tree) || !objekt(roh.tree[ROOT_ID])) {
    return { art: 'abgelehnt', ursache: 'unlesbar', probleme: [] }
  }
  const angehoben = hebeAufAktuell(roh.schemaVersion, roh.tree)
  if (angehoben.probleme.length > 0) {
    return { art: 'abgelehnt', ursache: 'verlust', probleme: angehoben.probleme }
  }
  const tree: BlockTree = Object.create(null) as BlockTree
  const probleme: LadeProblem[] = []
  const fund = (stelle: string, grund: string): void => { probleme.push({ bereich: BEREICH_AUFBAU, stelle, grund }) }
  for (const [id, node] of Object.entries(angehoben.tree)) {
    if (!objekt(node) || node.id !== id || typeof node.type !== 'string'
      || !objekt(node.props) || !Array.isArray(node.childIds)
      || !node.childIds.every((kind): kind is string => typeof kind === 'string')
      || !(node.parentId === null || typeof node.parentId === 'string')) {
      fund(id, `der Baustein „${id}“ ist unlesbar`)
      continue
    }
    const def = getBlockDefinition(node.type)
    if (id !== ROOT_ID && !def) {
      fund(id, `der Bausteintyp „${node.type}“ wird nicht unterstützt`)
      continue
    }
    if (id === ROOT_ID && (node.type !== ROOT_TYPE || node.parentId !== null)) {
      fund(id, 'die Wurzel des Masken-Aufbaus ist ungültig')
    }
    const props = id === ROOT_ID
      ? Object.fromEntries(Object.entries(node.props).filter(([key, wert]) =>
        [MASKEN_NAME_PROP, BELEG_RAHMEN_PROP].includes(key) && typeof wert === 'string'))
      : normalizeProps(node.type, node.props)
    const events = sanitizeBlockEvents(node.events, (def?.blockEvents ?? []).map((event) => event.key))
    if (!keinVerlust(node.props, props)) {
      fund(id, id === ROOT_ID ? 'an der Maske selbst stimmen Angaben nicht' : `am Baustein „${id}“ stimmen Angaben nicht`)
    }
    if (!keinVerlust(node.events, events)) fund(id, `eine Aktion am Baustein „${id}“ ist unlesbar`)
    tree[id] = { id, type: node.type, parentId: node.parentId, props,
      childIds: [...node.childIds], ...(events ? { events } : {}) }
  }
  if (probleme.length === 0) probleme.push(...topologieProbleme(tree))
  if (probleme.length > 0) return { art: 'abgelehnt', ursache: 'verlust', probleme }
  return { art: 'ok', baum: { tree, selectedId:
    typeof roh.selectedId === 'string' && roh.selectedId !== ROOT_ID && tree[roh.selectedId] ? roh.selectedId : null,
  } }
}

export function keinVerlust(roh: unknown, rein: unknown): boolean {
  if (roh === rein) return true
  if (Array.isArray(roh) || Array.isArray(rein)) {
    if (!Array.isArray(roh) || !Array.isArray(rein) || roh.length !== rein.length) return false
    return roh.every((x, i) => keinVerlust(x, rein[i]))
  }
  if (typeof roh !== 'object' || typeof rein !== 'object' || roh === null || rein === null) return false
  const a = roh as Record<string, unknown>
  const b = rein as Record<string, unknown>
  return Object.keys(a)
    .filter((k) => a[k] !== undefined)
    .every((k) => Object.prototype.hasOwnProperty.call(b, k) && keinVerlust(a[k], b[k]))
}

// Wo genau die Datei etwas enthaelt, das der Lader nicht uebernimmt. Eine Meldung
// ohne diese Stelle laesst den Bediener mit einer Datei stehen, die er nicht
// reparieren kann.
export function ersteAbweichung(roh: unknown, rein: unknown): string {
  if (Array.isArray(roh)) {
    if (!Array.isArray(rein) || roh.length !== rein.length) return 'die Anzahl der Einträge'
    for (let i = 0; i < roh.length; i++) {
      if (keinVerlust(roh[i], rein[i])) continue
      const e = roh[i] as Record<string, unknown> | null
      const name = e && typeof e.name === 'string' ? `„${e.name}"` : `Eintrag ${i + 1}`
      return `${name} → ${ersteAbweichung(roh[i], rein[i])}`
    }
    return ''
  }
  if (roh && typeof roh === 'object' && rein && typeof rein === 'object') {
    const a = roh as Record<string, unknown>
    const b = rein as Record<string, unknown>
    for (const k of Object.keys(a)) {
      if (a[k] === undefined) continue
      if (!Object.prototype.hasOwnProperty.call(b, k)) return `„${k}" (unbekannte Angabe)`
      if (!keinVerlust(a[k], b[k])) return `„${k}" → ${ersteAbweichung(a[k], b[k])}`
    }
    return ''
  }
  return `${JSON.stringify(roh)} wird als ${JSON.stringify(rein)} gelesen`
}

