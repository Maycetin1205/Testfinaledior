import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { BELEG_RAHMEN_PROP } from '../../kern/maske/belegRahmen'
import { MASKEN_NAME_PROP } from '../../kern/maske/maskenName'
import { kettenBereinigen } from '../../kern/daten/aktionen'
import { BEREICH_AUFBAU, type LadeProblem } from '../../kern/daten/ladeProblem'
import { CURRENT_SCHEMA_VERSION, ohneEntfallene, schemaLesbar } from './maskenSchema'
import { topologieProbleme } from './topologie'
import { werteBereinigen } from '../../kern/maske/baumOps'

function objekt(wert: unknown): wert is Record<string, unknown> {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert)
}

export type LadeAusgang =
  | { art: 'ok'; baum: { tree: Maskenbaum; selectedId: string | null }; entfallen: string[] }
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
  if (!objekt(roh.tree) || !objekt(roh.tree[WURZEL_ID])) {
    return { art: 'abgelehnt', ursache: 'unlesbar', probleme: [] }
  }
  const bereinigt = ohneEntfallene(roh.tree)
  const tree: Maskenbaum = Object.create(null) as Maskenbaum
  const probleme: LadeProblem[] = []
  const fund = (stelle: string, grund: string): void => { probleme.push({ bereich: BEREICH_AUFBAU, stelle, grund }) }
  for (const [id, node] of Object.entries(bereinigt.tree)) {
    if (!objekt(node) || node.id !== id || typeof node.typ !== 'string'
      || !objekt(node.werte) || !Array.isArray(node.kinderIds)
      || !node.kinderIds.every((kind): kind is string => typeof kind === 'string')
      || !(node.elternId === null || typeof node.elternId === 'string')) {
      fund(id, `der Baustein „${id}“ ist unlesbar`)
      continue
    }
    const def = bausteinArt(node.typ)
    if (id !== WURZEL_ID && !def) {
      fund(id, `der Bausteintyp „${node.typ}“ wird nicht unterstützt`)
      continue
    }
    if (id === WURZEL_ID && (node.typ !== WURZEL_TYP || node.elternId !== null)) {
      fund(id, 'die Wurzel des Masken-Aufbaus ist ungültig')
    }
    const props = id === WURZEL_ID
      ? Object.fromEntries(Object.entries(node.werte).filter(([key, wert]) =>
        [MASKEN_NAME_PROP, BELEG_RAHMEN_PROP].includes(key) && typeof wert === 'string'))
      : werteBereinigen(node.typ, node.werte)
    const events = kettenBereinigen(node.ketten, (faehigkeit(def, 'ereignisse')?.liste ?? []).map((event) => event.schluessel))
    if (!keinVerlust(node.werte, props)) {
      fund(id, id === WURZEL_ID ? 'an der Maske selbst stimmen Angaben nicht' : `am Baustein „${id}“ stimmen Angaben nicht`)
    }
    if (!keinVerlust(node.ketten, events)) fund(id, `eine Aktion am Baustein „${id}“ ist unlesbar`)
    tree[id] = { id, typ: node.typ, elternId: node.elternId, werte: props,
      kinderIds: [...node.kinderIds], ...(events ? { ketten: events } : {}) }
  }
  if (probleme.length === 0) probleme.push(...topologieProbleme(tree))
  if (probleme.length > 0) return { art: 'abgelehnt', ursache: 'verlust', probleme }
  return { art: 'ok', entfallen: bereinigt.entfallen, baum: { tree, selectedId:
    typeof roh.selectedId === 'string' && roh.selectedId !== WURZEL_ID && tree[roh.selectedId] ? roh.selectedId : null,
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

