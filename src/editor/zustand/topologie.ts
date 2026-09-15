// Der Baum als Ordnung: Vorfahren, Nachkommen, Reihenfolge.
import { WURZEL_ID, WURZEL_TYP, type Maskenbaum } from '../../kern/maske/baum'
import { darfEnthalten, bausteinArt } from '../../kern/maske/registry'
import { BEREICH_AUFBAU, type LadeProblem } from '../../kern/daten/ladeProblem'

function istSeite(tree: Maskenbaum, id: string): boolean {
  const typ = tree[id]?.typ
  return typ !== undefined && bausteinArt(typ)?.seite === true
}

export function topologieProbleme(tree: Maskenbaum): LadeProblem[] {
  const raus: LadeProblem[] = []
  const fund = (stelle: string, grund: string): void => {
    raus.push({ bereich: BEREICH_AUFBAU, stelle, grund })
  }

  const wurzel = tree[WURZEL_ID]
  if (!wurzel) {
    fund(WURZEL_ID, 'dem Masken-Aufbau fehlt seine Wurzel')
    return raus
  }
  if (wurzel.typ !== WURZEL_TYP || wurzel.elternId !== null) {
    fund(WURZEL_ID, 'die Wurzel des Masken-Aufbaus ist verbogen')
  }
  for (const knoten of Object.values(tree)) {
    if (knoten.id === WURZEL_ID) continue
    if (knoten.elternId === null || knoten.typ === WURZEL_TYP) {
      fund(knoten.id, 'dieser Baustein tritt als zweite Wurzel auf')
    }
  }

  for (const knoten of Object.values(tree)) {
    if (knoten.id === WURZEL_ID) continue
    const eltern = knoten.elternId === null ? undefined : tree[knoten.elternId]
    if (!eltern) {
      fund(knoten.id, 'dieser Baustein haengt an einem Eltern-Baustein, den es nicht gibt')
      continue
    }
    if (!eltern.kinderIds.includes(knoten.id)) {
      fund(knoten.id, 'der Eltern-Baustein kennt dieses Kind nicht')
    }
    if (!darfEnthalten(eltern.typ, knoten.typ)) {
      fund(knoten.id, `ein Baustein der Art „${knoten.typ}" darf nicht in „${eltern.typ}" liegen`)
    }

    if (istSeite(tree, knoten.id) && knoten.elternId !== WURZEL_ID) {
      fund(knoten.id, istSeite(tree, eltern.id)
        ? 'eine Seite liegt in einer anderen Seite'
        : 'eine Seite liegt nicht direkt unter der Wurzel')
    }
  }

  const gesehen = new Set<string>()
  const lauf = (id: string): void => {
    if (gesehen.has(id)) {
      fund(id, 'dieser Baustein haengt mehrfach im Aufbau')
      return
    }
    gesehen.add(id)
    const knoten = tree[id]
    if (!knoten) return
    for (const kind of knoten.kinderIds) {
      if (!tree[kind]) {
        fund(id, 'die Kinderliste nennt einen Baustein, den es nicht gibt')
        continue
      }
      lauf(kind)
    }
  }
  lauf(WURZEL_ID)
  for (const id of Object.keys(tree)) {
    if (!gesehen.has(id)) {
      fund(id, 'dieser Baustein ist von der Wurzel aus nicht erreichbar')
    }
  }

  return raus
}
