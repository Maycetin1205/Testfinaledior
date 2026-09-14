// Fragen an den Baustein-Baum: wer gibt eine Auswahl, wer erfasst, wer aendert, wer rechnet.
import { ROOT_ID, type BlockNode, type BlockTree } from './BlockData'
import type { ActionValueSpot, BindableSpot } from './BlockDefinition'
import { getBlockDefinition } from './blockRegistry'
import { schalterAn, schalterFuer } from './listenBindung'
import { propertySichtbar } from './PropertyDescription'
import { QUELLE_PROP } from './quelleProp'

export { QUELLE_PROP }

export interface ActionValueTarget {
  node: BlockNode
  spot: ActionValueSpot
}

export function actionValueTargets(tree: BlockTree): ActionValueTarget[] {
  const result: ActionValueTarget[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const spots = getBlockDefinition(node.type)?.actionValueSpots ?? []
    for (const spot of spots) result.push({ node, spot })
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function quellenIdsInKettenVon(node: BlockNode): string[] {
  const ids: string[] = []
  for (const event of getBlockDefinition(node.type)?.blockEvents ?? []) {
    for (const step of node.events?.[event.key] ?? []) {
      if (step.type !== 'RELATION') continue
      for (const binding of [...step.params, ...step.extraParams]) {
        if (binding.source !== 'data_field') continue
        const id = binding.dataSourceId ?? ''
        if (id !== '') ids.push(id)
      }
    }
  }
  return ids
}

export function relationIdsVon(node: BlockNode): string[] {
  const def = getBlockDefinition(node.type)
  const ids: string[] = []
  for (const prop of def?.customProperties ?? []) {
    if (prop.kind !== 'relation') continue
    const wert = node.props[prop.attributeName]
    if (typeof wert === 'string' && wert !== '') ids.push(wert)
  }
  for (const event of def?.blockEvents ?? []) {
    for (const step of node.events?.[event.key] ?? []) {
      if (step.type === 'RELATION' && step.relationId !== '') ids.push(step.relationId)
    }
  }
  return ids
}

export function traegtEigeneQuelle(node: BlockNode | undefined): boolean {
  if (!node) return false
  const kann = getBlockDefinition(node.type)?.acceptsDataSource
  if (!kann) return false
  return kann === true || propertySichtbar(kann.wenn, node.props)
}

export function bindbareStellenVon(node: BlockNode | undefined): readonly BindableSpot[] {
  if (!node) return []
  const stellen = getBlockDefinition(node.type)?.bindableSpots ?? []
  return stellen.filter((s) => propertySichtbar(s.wenn, node.props))
}

export function auswahlQuelleIdVon(node: BlockNode | undefined): string {
  if (!node) return ''
  const wahl = getBlockDefinition(node.type)?.satzWahl
  const prop = wahl && propertySichtbar(wahl.wenn, node.props)
    ? wahl.quelleProp ?? QUELLE_PROP
    : QUELLE_PROP
  const wert = node.props[prop]
  return typeof wert === 'string' ? wert : ''
}

// Geber ist, wer satzWahl deklariert UND eine Quelle aufloest. Die wenn-Bedingung
// waehlt nur, WELCHE Eigenschaft die Quelle nennt, sie ist kein Schalter fuer die
// Faehigkeit.
export function istAuswahlGeber(node: BlockNode | undefined): boolean {
  if (!node) return false
  if (!getBlockDefinition(node.type)?.satzWahl) return false
  return auswahlQuelleIdVon(node) !== ''
}

export function darfAuswahlFolgen(node: BlockNode | undefined): boolean {
  if (!node) return false
  if (getBlockDefinition(node.type)?.kannAuswahlFolgen !== true) return false
  return auswahlQuelleIdVon(node) !== ''
}

export function auswahlGeberImBaum(tree: BlockTree): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (istAuswahlGeber(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

// Nur die Zellen dieser Bausteine kann eine Kette als „Wert aus Erfassungszelle"
// lesen.
export function erfassungsTraegerImBaum(tree: BlockTree): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const kann = getBlockDefinition(node.type)?.kannErfassen
    if (kann && propertySichtbar(kann.wenn, node.props)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function loeschTraegerImBaum(tree: BlockTree): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (traegtLoeschungen(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function traegtLoeschungen(node: BlockNode): boolean {
  const kann = getBlockDefinition(node.type)?.kannLoeschen
  return kann !== undefined && propertySichtbar(kann.wenn, node.props)
}

// Gelesen wird ueber die Registry und die Liste des Bausteins; kein Bausteintyp
// kommt hier vor.
export function traegtAenderungen(node: BlockNode): boolean {
  const def = getBlockDefinition(node.type)
  const schluessel = def?.aenderungsSchluessel
  const bindung = def?.listenBindung
  if (schluessel === undefined || !bindung) return false
  const roh = node.props[bindung.prop]
  if (!Array.isArray(roh)) return false
  const schalter = (bindung.eintragsSchalter ?? []).find((s) => s.key === schluessel)
  if (!schalter) return false
  // Aenderbar ist ein Eintrag, dessen Schalter gilt, der ansteht und der an einem
  // Feld haengt: eine ungebundene Spalte hat nichts zu schreiben.
  return roh.some((x) => {
    if (!x || typeof x !== 'object') return false
    const eintrag = x as Record<string, unknown>
    return schalterFuer(bindung, eintrag).includes(schalter)
      && schalterAn(schalter, eintrag)
      && String(eintrag[bindung.feldKey] ?? '') !== ''
  })
}

export function aenderungsTraegerImBaum(tree: BlockTree): BlockNode[] {
  const result: BlockNode[] = []
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    if (traegtAenderungen(node)) result.push(node)
    for (const childId of node.childIds) visit(tree[childId])
  }
  visit(tree[ROOT_ID])
  return result
}

export function firstDescendantOfType(
  tree: BlockTree,
  rootId: string,
  type: string,
): string | undefined {
  for (const cid of tree[rootId]?.childIds ?? []) {
    const child = tree[cid]
    if (!child) continue
    if (child.type === type) return cid
    const found = firstDescendantOfType(tree, cid, type)
    if (found) return found
  }
  return undefined
}

// Traegt dieser Baustein Berechnungen? Steht in der Registry, nicht als
// Abfrage auf einen Bausteintyp.
export function kannRechnen(node: BlockNode): boolean {
  return getBlockDefinition(node.type)?.rechenGruppen !== undefined
}
