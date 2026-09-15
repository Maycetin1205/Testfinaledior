// Fragen an den Baustein-Baum: wer gibt eine Auswahl, wer erfasst, wer aendert, wer rechnet.
import { WURZEL_ID, type Baustein, type Maskenbaum } from './baum'
import { type Wertstelle, type BindbareStelle, faehigkeit, gilt, hatFaehigkeit } from './faehigkeiten'
import { bausteinArt } from './registry'
import { schalterAn, schalterFuer } from './listenBindung'
import { eigenschaftSichtbar } from './eigenschaft'
import { QUELLE_PROP } from './quelleProp'

export { QUELLE_PROP }

export interface WertstellenZiel {
  node: Baustein
  spot: Wertstelle
}

export function wertstellenImBaum(tree: Maskenbaum): WertstellenZiel[] {
  const result: WertstellenZiel[] = []
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    const spots = faehigkeit(bausteinArt(node.typ), 'aktionswert')?.stellen ?? []
    for (const spot of spots) result.push({ node, spot })
    for (const childId of node.kinderIds) visit(tree[childId])
  }
  visit(tree[WURZEL_ID])
  return result
}

export function quellenIdsInKettenVon(node: Baustein): string[] {
  const ids: string[] = []
  for (const event of faehigkeit(bausteinArt(node.typ), 'ereignisse')?.liste ?? []) {
    for (const step of node.ketten?.[event.schluessel] ?? []) {
      if (step.art !== 'RELATION') continue
      for (const binding of [...step.parameter, ...step.zusatzParameter]) {
        if (binding.quelle !== 'data_field') continue
        const id = binding.quelleId ?? ''
        if (id !== '') ids.push(id)
      }
    }
  }
  return ids
}

export function relationIdsVon(node: Baustein): string[] {
  const def = bausteinArt(node.typ)
  const ids: string[] = []
  for (const prop of def?.eigenschaften ?? []) {
    if (prop.art !== 'relation') continue
    const wert = node.werte[prop.schluessel]
    if (typeof wert === 'string' && wert !== '') ids.push(wert)
  }
  for (const event of faehigkeit(def, 'ereignisse')?.liste ?? []) {
    for (const step of node.ketten?.[event.schluessel] ?? []) {
      if (step.art === 'RELATION' && step.relationId !== '') ids.push(step.relationId)
    }
  }
  return ids
}

export function traegtEigeneQuelle(node: Baustein | undefined): boolean {
  if (!node) return false
  return gilt(faehigkeit(bausteinArt(node.typ), 'quelle'), node.werte)
}

export function bindbareStellenVon(node: Baustein | undefined): readonly BindbareStelle[] {
  if (!node) return []
  const stellen = faehigkeit(bausteinArt(node.typ), 'bindbar')?.stellen ?? []
  return stellen.filter((s) => eigenschaftSichtbar(s.wenn, node.werte))
}

export function auswahlQuelleIdVon(node: Baustein | undefined): string {
  if (!node) return ''
  const wahl = faehigkeit(bausteinArt(node.typ), 'satzwahl')
  const prop = wahl && eigenschaftSichtbar(wahl.wenn, node.werte)
    ? wahl.quelleProp ?? QUELLE_PROP
    : QUELLE_PROP
  const wert = node.werte[prop]
  return typeof wert === 'string' ? wert : ''
}

// Geber ist, wer satzWahl deklariert UND eine Quelle aufloest. Die wenn-Bedingung
// waehlt nur, WELCHE Eigenschaft die Quelle nennt, sie ist kein Schalter fuer die
// Faehigkeit.
export function istAuswahlGeber(node: Baustein | undefined): boolean {
  if (!node) return false
  if (!hatFaehigkeit(bausteinArt(node.typ), 'satzwahl')) return false
  return auswahlQuelleIdVon(node) !== ''
}

export function darfAuswahlFolgen(node: Baustein | undefined): boolean {
  if (!node) return false
  if (!hatFaehigkeit(bausteinArt(node.typ), 'auswahlFolgen')) return false
  return auswahlQuelleIdVon(node) !== ''
}

export function auswahlGeberImBaum(tree: Maskenbaum): Baustein[] {
  const result: Baustein[] = []
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    if (istAuswahlGeber(node)) result.push(node)
    for (const childId of node.kinderIds) visit(tree[childId])
  }
  visit(tree[WURZEL_ID])
  return result
}

// Nur die Zellen dieser Bausteine kann eine Kette als „Wert aus Erfassungszelle"
// lesen.
export function erfassungsTraegerImBaum(tree: Maskenbaum): Baustein[] {
  const result: Baustein[] = []
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    if (gilt(faehigkeit(bausteinArt(node.typ), 'erfassen'), node.werte)) result.push(node)
    for (const childId of node.kinderIds) visit(tree[childId])
  }
  visit(tree[WURZEL_ID])
  return result
}

export function loeschTraegerImBaum(tree: Maskenbaum): Baustein[] {
  const result: Baustein[] = []
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    if (traegtLoeschungen(node)) result.push(node)
    for (const childId of node.kinderIds) visit(tree[childId])
  }
  visit(tree[WURZEL_ID])
  return result
}

export function traegtLoeschungen(node: Baustein): boolean {
  return gilt(faehigkeit(bausteinArt(node.typ), 'loeschen'), node.werte)
}

// Gelesen wird ueber die Registry und die Liste des Bausteins; kein Bausteintyp
// kommt hier vor.
export function traegtAenderungen(node: Baustein): boolean {
  const def = bausteinArt(node.typ)
  const schluessel = faehigkeit(def, 'aendern')?.schluessel
  const bindung = faehigkeit(def, 'liste')?.bindung
  if (schluessel === undefined || !bindung) return false
  const roh = node.werte[bindung.prop]
  if (!Array.isArray(roh)) return false
  const schalter = (bindung.eintragsSchalter ?? []).find((s) => s.schluessel === schluessel)
  if (!schalter) return false
  // Aenderbar ist ein Eintrag, dessen Schalter gilt, der ansteht und der an einem
  // Feld haengt: eine ungebundene Spalte hat nichts zu schreiben.
  return roh.some((x) => {
    if (!x || typeof x !== 'object') return false
    const eintrag = x as Record<string, unknown>
    return schalterFuer(bindung, eintrag).includes(schalter)
      && schalterAn(schalter, eintrag)
      && String(eintrag[bindung.feldSchluessel] ?? '') !== ''
  })
}

export function aenderungsTraegerImBaum(tree: Maskenbaum): Baustein[] {
  const result: Baustein[] = []
  const visit = (node: Baustein | undefined): void => {
    if (!node) return
    if (traegtAenderungen(node)) result.push(node)
    for (const childId of node.kinderIds) visit(tree[childId])
  }
  visit(tree[WURZEL_ID])
  return result
}

export function ersterNachfahreVomTyp(
  tree: Maskenbaum,
  rootId: string,
  type: string,
): string | undefined {
  for (const cid of tree[rootId]?.kinderIds ?? []) {
    const child = tree[cid]
    if (!child) continue
    if (child.typ === type) return cid
    const found = ersterNachfahreVomTyp(tree, cid, type)
    if (found) return found
  }
  return undefined
}

// Traegt dieser Baustein Berechnungen? Steht in der Registry, nicht als
// Abfrage auf einen Bausteintyp.
export function kannRechnen(node: Baustein): boolean {
  return hatFaehigkeit(bausteinArt(node.typ), 'rechnen')
}
