import { ROOT_ID, ROOT_TYPE, type MaskTree } from '../../core/block/tree'
import { mayContain, blockType } from '../../core/block/registry'
import { AREA_LAYOUT, type LoadProblem } from '../../core/data/loadProblem'

function isPage(tree: MaskTree, id: string): boolean {
  const type = tree[id]?.type
  return type !== undefined && blockType(type)?.page === true
}

export function topologieProblems(tree: MaskTree): LoadProblem[] {
  const out: LoadProblem[] = []
  const find = (spot: string, base: string): void => {
    out.push({ area: AREA_LAYOUT, spot, base })
  }

  const root = tree[ROOT_ID]
  if (!root) {
    find(ROOT_ID, 'dem Masken-Aufbau fehlt seine Wurzel')
    return out
  }
  if (root.type !== ROOT_TYPE || root.parentId !== null) {
    find(ROOT_ID, 'die Wurzel des Masken-Aufbaus ist verbogen')
  }
  for (const node of Object.values(tree)) {
    if (node.id === ROOT_ID) continue
    if (node.parentId === null || node.type === ROOT_TYPE) {
      find(node.id, 'dieser Baustein tritt als zweite Wurzel auf')
    }
  }

  for (const node of Object.values(tree)) {
    if (node.id === ROOT_ID) continue
    const parent = node.parentId === null ? undefined : tree[node.parentId]
    if (!parent) {
      find(node.id, 'dieser Baustein haengt an einem Eltern-Baustein, den es nicht gibt')
      continue
    }
    if (!parent.childIds.includes(node.id)) {
      find(node.id, 'der Eltern-Baustein kennt dieses Kind nicht')
    }
    if (!mayContain(parent.type, node.type)) {
      find(node.id, `ein Baustein der Art „${node.type}" darf nicht in „${parent.type}" liegen`)
    }

    if (isPage(tree, node.id) && node.parentId !== ROOT_ID) {
      find(node.id, isPage(tree, parent.id)
        ? 'eine Seite liegt in einer anderen Seite'
        : 'eine Seite liegt nicht direkt unter der Wurzel')
    }
  }

  const seen = new Set<string>()
  const run = (id: string): void => {
    if (seen.has(id)) {
      find(id, 'dieser Baustein haengt mehrfach im Aufbau')
      return
    }
    seen.add(id)
    const node = tree[id]
    if (!node) return
    for (const kind of node.childIds) {
      if (!tree[kind]) {
        find(id, 'die Kinderliste nennt einen Baustein, den es nicht gibt')
        continue
      }
      run(kind)
    }
  }
  run(ROOT_ID)
  for (const id of Object.keys(tree)) {
    if (!seen.has(id)) {
      find(id, 'dieser Baustein ist von der Wurzel aus nicht erreichbar')
    }
  }

  return out
}
