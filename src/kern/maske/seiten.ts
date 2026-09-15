// Seiten und Ansichten der Maske: anlegen, umbenennen, wechseln, loeschen.
import { WURZEL_ID, type Baustein, type Maskenbaum } from './baum'
import { bausteinArt } from './registry'

export interface SeitenEintrag {
  id: string
  name: string
  istHauptseite: boolean

  istFlaeche: boolean
}

export function istSeitenBaustein(node: Baustein): boolean {
  return bausteinArt(node.type)?.pageBlock === true
}

export function istFlaechenSeite(node: Baustein): boolean {
  return bausteinArt(node.type)?.flaechenSeite === true
}

export function istFensterSeite(eintrag: SeitenEintrag): boolean {
  return !eintrag.istHauptseite && !eintrag.istFlaeche
}

export function freierSeitenName(vergeben: readonly string[], basis: string): string {
  const belegt = new Set(vergeben)
  let name = basis
  for (let n = 2; belegt.has(name); n++) name = `${basis} ${n}`
  return name
}

export function aktiveSeitenWurzel(tree: Maskenbaum, activePageId: string): string {
  return activePageId === WURZEL_ID || (tree[activePageId] && istSeitenBaustein(tree[activePageId]))
    ? activePageId : WURZEL_ID
}

export function seiteVon(tree: Maskenbaum, id: string): string {
  let cur: Baustein | undefined = tree[id]
  while (cur) {
    if (istSeitenBaustein(cur)) return cur.id
    cur = cur.parentId ? tree[cur.parentId] : undefined
  }
  return WURZEL_ID
}

export function seitenDerMaske(tree: Maskenbaum): SeitenEintrag[] {
  const seiten = (tree[WURZEL_ID]?.childIds ?? [])
    .map((id) => tree[id])
    .filter((n): n is Baustein => Boolean(n) && istSeitenBaustein(n))
    .map((n) => ({
      id: n.id,
      name: typeof n.props.name === 'string' && n.props.name !== ''
        ? n.props.name
        : bausteinArt(n.type)?.displayName ?? 'Seite',
      istHauptseite: false,
      istFlaeche: istFlaechenSeite(n),
    }))
  return [{ id: WURZEL_ID, name: 'Hauptseite', istHauptseite: true, istFlaeche: true }, ...seiten]
}

function eindeutigerSeitenName(
  seiten: readonly SeitenEintrag[],
  eigeneId: string,
  wunsch: string,
): string {
  const schluessel = (s: string): string => s.trim().toLocaleLowerCase('de-DE')
  const belegt = new Set(
    seiten.filter((s) => s.id !== eigeneId).map((s) => schluessel(s.name)),
  )
  const basis = wunsch.trim()
  let name = basis
  for (let n = 2; belegt.has(schluessel(name)); n++) name = `${basis} ${n}`
  return name
}

export function schreibWert(
  def: { pageBlock?: boolean } | undefined,
  seiten: readonly SeitenEintrag[],
  id: string,
  attr: string,
  wunsch: unknown,
): unknown {
  if (attr !== 'name' || def?.pageBlock !== true) return wunsch
  const name = eindeutigerSeitenName(seiten, id, typeof wunsch === 'string' ? wunsch : '')
  return name === '' ? null : name
}

export function klarnamenNachziehen(tree: Maskenbaum, seitenId: string, name: string): Maskenbaum {
  let next = tree
  for (const knotenId of Object.keys(tree)) {
    for (const p of bausteinArt(next[knotenId].type)?.customProperties ?? []) {
      if (p.kind !== 'seite' || !p.klarnameProp) continue
      const aktuell = next[knotenId]
      if (aktuell.props[p.attributeName] !== seitenId) continue
      if (next === tree) next = { ...tree }
      next[knotenId] = { ...aktuell, props: { ...aktuell.props, [p.klarnameProp]: name } }
    }
  }
  return next
}

export function kinderImFluss(tree: Maskenbaum, parentId: string): Baustein[] {
  const parent = tree[parentId]
  if (!parent) return []
  return parent.childIds
    .map((id) => tree[id])
    .filter((n): n is Baustein => Boolean(n) && !istSeitenBaustein(n))
}
