import { ROOT_ID, type BlockNode, type MaskTree } from '../core/block/tree'
import { fieldChoicesRead, splitBinding } from '../core/block/blockType'
import { bindingProp, capability } from '../core/block/capability'
import { blockType } from '../core/block/registry'
import { propertyVisible } from '../core/block/property'
import {
  selectionSourceIdOf,
  bindableSpotsOf,
  maySelectionFollows,
  SOURCE_PROP,
  carriesOwnSource,
} from '../core/block/treeQuery'
import { SELECTION_FOLLOW_PROP, selectionFollowsFrom, followUsable } from '../core/data/selectionFollow'
import { dataFieldsFrom } from '../core/data/calculation'
import type { DataSource } from '../core/data/dataSources'
import { deliveryAdapter } from '../core/data/deliveries/deliveries'
import {
  sourceUsable,
  completePairs,
  EXTRA_SOURCES_PROP,
  extraSourcesFrom,
  type SourceInReach,
} from '../core/data/extraSources'
import { sourceIdsUsedBy, sourcesInReach } from '../core/block/sourcesInReach'
import { stepAdapter } from '../core/data/steps/steps'

// The fields of other sources a source reads while its rows are fetched.
function fieldsReadBy(source: DataSource): { sourceId: string; code: string }[] {
  const out: { sourceId: string; code: string }[] = []
  for (const binding of deliveryAdapter(source.delivery.kind).bindings(source.delivery)) {
    if (binding.source !== 'dataField') continue
    const sourceId = binding.sourceId ?? ''
    if (sourceId !== '') out.push({ sourceId, code: binding.value })
  }
  return out
}

export function collectDataSources(
  tree: MaskTree,
  sources: readonly DataSource[],
): DataSource[] {
  const seen = new Set<string>()
  const acc: DataSource[] = []
  const add = (id: string): void => {
    const src = sources.find((s) => s.id === id)
    if (src && !seen.has(src.id)) {
      seen.add(src.id)
      acc.push(src)
    }
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    for (const id of sourceIdsUsedBy(node)) add(id)
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])

  for (let i = 0; i < acc.length; i++) {
    for (const { sourceId } of fieldsReadBy(acc[i])) add(sourceId)
  }
  return acc
}

export function usedFieldsPerSource(
  tree: MaskTree,
  sources: readonly DataSource[],
): Map<string, ReadonlySet<string>> {
  const fields = new Map<string, Set<string>>()

  const remember = (sourceId: string, code: unknown): void => {
    if (sourceId === '' || typeof code !== 'string' || code.trim() === '') return
    const present = fields.get(sourceId)
    if (present) present.add(code.trim())
    else fields.set(sourceId, new Set([code.trim()]))
  }

  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const def = blockType(node.type)

    let reach: SourceInReach[] | undefined
    const inReach = (): SourceInReach[] => (
      reach ??= sourcesInReach(tree, node.id, sources)
    )

    const rememberBinding = (value: unknown): void => {
      if (typeof value !== 'string' || value === '') return
      const { sourceId, code } = splitBinding(value)
      const target = sourceId === ''
        ? inReach()[0]
        : inReach().find((q) => q.source.id === sourceId)
      if (target) remember(target.source.id, code)
    }

    for (const spot of bindableSpotsOf(node)) {
      rememberBinding(node.values[bindingProp(spot.prop)])
    }

    const b = capability(def, 'list')?.binding
    if (b) {
      const ownSource = b.sourceProp === undefined
        ? undefined
        : String(node.values[b.sourceProp] ?? '')
      const rememberEntryField = (value: unknown): void => {
        if (ownSource === undefined) rememberBinding(value)
        else remember(ownSource, value)
      }

      for (const entry of b.entries(node.values[b.prop])) {
        rememberEntryField(b.fieldOf(entry))

        for (const { value } of fieldChoicesRead(b, entry)) rememberEntryField(value)
      }
    }

    const compute = capability(def, 'compute')
    if (compute) {
      for (const field of dataFieldsFrom(node.values[compute.prop])) {
        rememberBinding(field)
      }
    }

    for (const [key, prop] of Object.entries(def?.properties ?? {})) {
      if (prop.type.control !== 'field') continue
      if (!propertyVisible(prop.when, node.values)) continue

      if (prop.sourceProp === undefined) rememberBinding(node.values[key])
      else remember(String(node.values[prop.sourceProp] ?? ''), node.values[key])
    }

    if (carriesOwnSource(node)) {
      const first = typeof node.values[SOURCE_PROP] === 'string' ? node.values[SOURCE_PROP] : ''
      for (const q of extraSourcesFrom(node.values[EXTRA_SOURCES_PROP])) {
        if (!sourceUsable(q)) continue

        const partner = q.partnerId === '' ? first : q.partnerId
        for (const pair of completePairs(q)) {
          if (pair.from === 'document') remember(pair.fromSourceId ?? '', pair.fromField)
          else if (pair.from === undefined) remember(partner, pair.fromField)
          remember(q.sourceId, pair.toField)
        }
      }
    }

    if (maySelectionFollows(node)) {
      const own = selectionSourceIdOf(node)
      for (const follow of selectionFollowsFrom(node.values[SELECTION_FOLLOW_PROP])) {
        if (!followUsable(follow)) continue
        const giver = selectionSourceIdOf(tree[follow.giverId])
        for (const pair of completePairs(follow)) {
          remember(giver, pair.fromField)
          remember(own, pair.toField)
        }
      }
    }

    for (const event of capability(def, 'events')?.list ?? []) {
      for (const step of node.chains?.[event.key] ?? []) {
        for (const binding of stepAdapter(step.kind).bindings(step)) {
          if (binding.source === 'dataField') {
            remember(binding.sourceId ?? '', binding.value)
          } else if (binding.source === 'chosenRow') {
            remember(selectionSourceIdOf(tree[binding.blockId ?? '']), binding.value)
          }
        }
      }
    }
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])

  for (const source of collectDataSources(tree, sources)) {
    for (const { sourceId, code } of fieldsReadBy(source)) remember(sourceId, code)
  }
  return fields
}

export function getKeyPerGiver(
  tree: MaskTree,
  sources: readonly DataSource[],
): Map<string, string[]> {
  const perGiver = new Map<string, string[]>()
  const remember = (giverId: string, codes: readonly string[]): void => {
    if (giverId === '') return
    const list = perGiver.get(giverId) ?? []
    for (const code of codes) if (code !== '' && !list.includes(code)) list.push(code)
    perGiver.set(giverId, list)
  }
  const visit = (node: BlockNode | undefined): void => {
    if (!node) return
    const source = sources.find((s) => s.id === selectionSourceIdOf(node))
    const giverFields = source ? deliveryAdapter(source.delivery.kind).giverFields(source.delivery) : []
    if (giverFields.length > 0) {
      for (const follow of selectionFollowsFrom(node.values[SELECTION_FOLLOW_PROP])) {
        remember(selectionSourceIdOf(tree[follow.giverId]), giverFields)
      }
    }
    node.childIds.forEach((id) => visit(tree[id]))
  }
  visit(tree[ROOT_ID])
  return perGiver
}
