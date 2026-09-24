import type { BlockNode, MaskTree } from '../../core/block/tree'
import type { BlockType } from '../../core/block/blockType'
import { capability } from '../../core/block/capability'
import { CELLS_PARAM_SOURCES } from '../../core/data/actions'
import { stepAdapter, type Step } from '../../core/data/steps/steps'

export function droppedKeys(
  def: BlockType | undefined,
  attr: string,
  old: unknown,
  next: unknown,
): string[] {
  const b = capability(def, 'list')?.binding
  const keyOf = b?.keyOf
  if (!b || keyOf === undefined || b.prop !== attr) return []
  const keys = (value: unknown): string[] => b.entries(value)
    .map(keyOf)
    .filter((key) => key !== '')
  const stays = new Set(keys(next))
  return keys(old).filter((key) => !stays.has(key))
}

function stepWithoutPointer(
  step: Step,
  blockId: string,
  away: ReadonlySet<string>,
): { step: Step; hit: number } | null {
  let hit = 0
  const next = stepAdapter(step.kind).withBindings(step, (b) => {
    const shows = CELLS_PARAM_SOURCES[b.source] !== undefined
      && (b.blockId ?? '') === blockId
      && away.has(b.value)
    if (!shows) return b
    hit++

    return { source: 'omitted' as const, value: '' }
  })
  return hit > 0 ? { step: next, hit } : null
}

export interface Cleared {
  tree: MaskTree

  parameter: number
  blocks: number
}

export function withoutColumnsPointer(
  tree: MaskTree,
  blockId: string,
  dropped: readonly string[],
): Cleared {
  if (dropped.length === 0) return { tree, parameter: 0, blocks: 0 }
  const away = new Set(dropped)
  let parameter = 0
  let blocks = 0
  const next: MaskTree = { ...tree }
  for (const node of Object.values(tree) as BlockNode[]) {
    if (!node.chains) continue
    const events: Record<string, Step[]> = {}
    let nodeHit = 0
    for (const [key, steps] of Object.entries(node.chains)) {
      events[key] = steps.map((s) => {
        const next = stepWithoutPointer(s, blockId, away)
        if (!next) return s
        nodeHit += next.hit
        return next.step
      })
    }
    if (nodeHit === 0) continue
    next[node.id] = { ...node, chains: events }
    parameter += nodeHit
    blocks++
  }
  return blocks > 0 ? { tree: next, parameter, blocks } : { tree, parameter: 0, blocks: 0 }
}
