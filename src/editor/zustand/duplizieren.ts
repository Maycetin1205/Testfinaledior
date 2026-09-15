// Einen Baustein samt Kindern kopieren, mit neuen Kennungen.
import { WURZEL_ID, type Baustein, type Maskenbaum } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { type Parameter, type Schritt, type Ketten } from '../../kern/daten/aktionen'
import { AUSWAHL_FOLGE_PROP } from '../../kern/daten/auswahlFolge'
import { deepClone } from '../../kern/deepClone'
import { istSeitenBaustein } from '../../kern/maske/seiten'
import { freiePositionFuerKopie } from '../../kern/maske/rasterFlaeche'

export type NeueIdFuer = (alteId: string) => string | undefined

function schreibeBlockReferenzenUm(node: Baustein, neueIdFuer: NeueIdFuer): Baustein {
  const folgen = umgeschriebeneFolgen(node.props[AUSWAHL_FOLGE_PROP], neueIdFuer)
  const events = node.events === undefined
    ? undefined
    : umgeschriebeneEreignisse(node.events, neueIdFuer)

  const seiten = umgeschriebeneSeiten(node, neueIdFuer)
  const propsNeu = folgen !== node.props[AUSWAHL_FOLGE_PROP] || seiten !== null
  const eventsNeu = events !== undefined && events !== node.events
  if (!propsNeu && !eventsNeu) return node
  return {
    ...node,
    ...(propsNeu
      ? { props: { ...node.props, ...seiten, [AUSWAHL_FOLGE_PROP]: folgen } }
      : {}),
    ...(eventsNeu ? { events } : {}),
  }
}

function ersatzId(alt: unknown, neueIdFuer: NeueIdFuer): string | undefined {
  if (typeof alt !== 'string' || alt === '') return undefined
  return neueIdFuer(alt)
}

function umgeschriebeneFolgen(roh: unknown, neueIdFuer: NeueIdFuer): unknown {
  if (!Array.isArray(roh)) return roh
  let geaendert = false
  const naechste = roh.map((eintrag: unknown) => {
    if (eintrag === null || typeof eintrag !== 'object' || Array.isArray(eintrag)) return eintrag
    const felder = eintrag as Record<string, unknown>
    const ziel = ersatzId(felder.geberId, neueIdFuer)
    if (ziel === undefined) return eintrag
    geaendert = true
    return { ...felder, geberId: ziel }
  })
  return geaendert ? naechste : roh
}

function umgeschriebeneSeiten(
  node: Baustein,
  neueIdFuer: NeueIdFuer,
): Record<string, unknown> | null {
  let treffer: Record<string, unknown> | null = null
  for (const p of bausteinArt(node.type)?.customProperties ?? []) {
    if (p.kind !== 'seite') continue
    const ziel = ersatzId(node.props[p.attributeName], neueIdFuer)
    if (ziel === undefined) continue
    treffer = { ...(treffer ?? {}), [p.attributeName]: ziel }
  }
  return treffer
}

function umgeschriebeneBindung(
  bindung: Parameter,
  neueIdFuer: NeueIdFuer,
): Parameter {
  const ziel = ersatzId(bindung.blockId, neueIdFuer)
  return ziel === undefined ? bindung : { ...bindung, blockId: ziel }
}

function umgeschriebenerSchritt(schritt: Schritt, neueIdFuer: NeueIdFuer): Schritt {
  if (schritt.type === 'POPUP_OPEN' || schritt.type === 'POPUP_CLOSE') {
    const ziel = ersatzId(schritt.popupId, neueIdFuer)
    return ziel === undefined ? schritt : { ...schritt, popupId: ziel }
  }
  if (schritt.type !== 'RELATION') return schritt
  const params = schritt.params.map((b) => umgeschriebeneBindung(b, neueIdFuer))
  const extraParams = schritt.extraParams.map((b) => umgeschriebeneBindung(b, neueIdFuer))
  const geaendert = params.some((b, i) => b !== schritt.params[i])
    || extraParams.some((b, i) => b !== schritt.extraParams[i])
  return geaendert ? { ...schritt, params, extraParams } : schritt
}

function umgeschriebeneEreignisse(
  events: Ketten,
  neueIdFuer: NeueIdFuer,
): Ketten {
  let geaendert = false
  const naechste: Ketten = {}
  for (const [key, kette] of Object.entries(events)) {
    const neueKette = kette.map((s) => umgeschriebenerSchritt(s, neueIdFuer))
    if (neueKette.some((s, i) => s !== kette[i])) geaendert = true
    naechste[key] = neueKette
  }
  return geaendert ? naechste : events
}

function kloneTeilbaum(
  tree: Maskenbaum,
  id: string,
): { nodes: Maskenbaum; kopieId: string } {
  const nodes: Maskenbaum = {}
  const neueIds = new Map<string, string>()
  const kopiere = (quellId: string, parentId: string | null): string => {
    const quelle = tree[quellId]
    const neueId = crypto.randomUUID()
    neueIds.set(quellId, neueId)
    const childIds = quelle.childIds.map((c) => kopiere(c, neueId))
    nodes[neueId] = {
      id: neueId,
      type: quelle.type,
      props: deepClone(quelle.props),

      ...(quelle.events ? { events: deepClone(quelle.events) } : {}),
      parentId,
      childIds,
    }
    return neueId
  }
  const kopieId = kopiere(id, tree[id].parentId)
  for (const neueId of neueIds.values()) {
    nodes[neueId] = schreibeBlockReferenzenUm(nodes[neueId], (alt) => neueIds.get(alt))
  }
  return { nodes, kopieId }
}

export function dupliziereTeilbaum(
  tree: Maskenbaum,
  id: string,
): { tree: Maskenbaum; kopieId: string } | null {
  const original = tree[id]
  if (!original || id === WURZEL_ID || original.parentId === null) return null
  if (istSeitenBaustein(original)) return null
  const parent = tree[original.parentId]
  if (!parent) return null
  const { nodes, kopieId } = kloneTeilbaum(tree, id)
  nodes[kopieId] = freiePositionFuerKopie(tree, parent.id, nodes[kopieId])
  const childIds = [...parent.childIds]
  childIds.splice(parent.childIds.indexOf(id) + 1, 0, kopieId)
  return {
    tree: { ...tree, ...nodes, [parent.id]: { ...parent, childIds } },
    kopieId,
  }
}
