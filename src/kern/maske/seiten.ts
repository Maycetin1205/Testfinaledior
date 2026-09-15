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
  return bausteinArt(node.typ)?.seite === true
}

export function istFlaechenSeite(node: Baustein): boolean {
  return bausteinArt(node.typ)?.flaechenSeite === true
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
    cur = cur.elternId ? tree[cur.elternId] : undefined
  }
  return WURZEL_ID
}

export function seitenDerMaske(tree: Maskenbaum): SeitenEintrag[] {
  const seiten = (tree[WURZEL_ID]?.kinderIds ?? [])
    .map((id) => tree[id])
    .filter((n): n is Baustein => Boolean(n) && istSeitenBaustein(n))
    .map((n) => ({
      id: n.id,
      name: typeof n.werte.name === 'string' && n.werte.name !== ''
        ? n.werte.name
        : bausteinArt(n.typ)?.name ?? 'Seite',
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
  def: { seite?: boolean } | undefined,
  seiten: readonly SeitenEintrag[],
  id: string,
  attr: string,
  wunsch: unknown,
): unknown {
  if (attr !== 'name' || def?.seite !== true) return wunsch
  const name = eindeutigerSeitenName(seiten, id, typeof wunsch === 'string' ? wunsch : '')
  return name === '' ? null : name
}

export function klarnamenNachziehen(tree: Maskenbaum, seitenId: string, name: string): Maskenbaum {
  let next = tree
  for (const knotenId of Object.keys(tree)) {
    for (const p of bausteinArt(next[knotenId].typ)?.eigenschaften ?? []) {
      if (p.art !== 'seite' || !p.klarnameProp) continue
      const aktuell = next[knotenId]
      if (aktuell.werte[p.schluessel] !== seitenId) continue
      if (next === tree) next = { ...tree }
      next[knotenId] = { ...aktuell, werte: { ...aktuell.werte, [p.klarnameProp]: name } }
    }
  }
  return next
}

export function kinderImFluss(tree: Maskenbaum, parentId: string): Baustein[] {
  const parent = tree[parentId]
  if (!parent) return []
  return parent.kinderIds
    .map((id) => tree[id])
    .filter((n): n is Baustein => Boolean(n) && !istSeitenBaustein(n))
}
