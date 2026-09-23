import type { BlockType } from '../../core/block/blockType'
import type { PropertyValue } from '../../core/block/property'
import { capability, hasCapability } from '../../core/block/capability'
import { allBlockTypes } from '../../core/block/registry'
import { propertyVisible } from '../../core/block/property'
import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { BLOCK_ID_ATTR } from '../../core/data/actions'
import { fetchQuerySource } from '../../softengine/queryLoader'
import { hasSeData, onSeData } from '../../softengine/bridge'
import { runtimeSources } from '../../softengine/runtimeSources'
import { loadRowsPerRelation } from '../../softengine/relationLoader'
import { fetchValueSource } from '../../softengine/valueLoader'
import {
  onSelectionList,
  selectionFor,
  selectionGiverOf,
  selectionNumber,
  traitOf,
} from './selection'

const lastPrint = new Map<string, string>()

const silentLoaded = new Map<string, Set<string>>()

let wired = false

function defsWithRecordChoice(): Map<string, BlockType> {
  const map = new Map<string, BlockType>()
  for (const def of allBlockTypes()) {
    if (hasCapability(def, 'recordPick')) map.set(def.tag.toLowerCase(), def)
  }
  return map
}

function sourcesAttrFor(el: Element, def: BlockType): string {
  const choice = capability(def, 'recordPick')
  if (!choice) return ''
  let active = true
  if (choice.when) {
    const name = choice.when.key
    const raw = el.getAttribute(name.toLowerCase())
    const declared = def.properties[name]
    const value = raw ?? declared?.default
    active = propertyVisible(choice.when, { [name]: value as PropertyValue })
  }
  return (active ? choice.sourceProp ?? SOURCE_PROP : SOURCE_PROP).toLowerCase()
}

function chosenRowOfSource(
  sourceId: string,
  defsPerTag: Map<string, BlockType>,
  root: ParentNode | undefined = typeof document === 'undefined' ? undefined : document,
): { row: unknown; giver: boolean } {
  if (sourceId === '' || root === undefined) return { row: undefined, giver: false }
  let newest: { row: unknown; number: number } | null = null
  let giver = false
  for (const el of Array.from(root.querySelectorAll(`[${BLOCK_ID_ATTR}]`))) {
    const def = defsPerTag.get(el.tagName.toLowerCase())
    if (!def) continue
    const attr = sourcesAttrFor(el, def)
    if (attr === '' || el.getAttribute(attr) !== sourceId) continue
    for (const giverId of selectionGiverOf(el as HTMLElement)) {
      giver = true
      const row = selectionFor(giverId)
      if (row === undefined) continue
      const number = selectionNumber(giverId)
      if (newest === null || number > newest.number) newest = { row, number }
    }
  }
  return { row: newest?.row, giver }
}

function mayLoad(sourceId: string, print: string, byControls: boolean): boolean {
  if (lastPrint.get(sourceId) === print) return false
  if (byControls) {
    silentLoaded.set(sourceId, new Set([print]))
  } else {
    const track = silentLoaded.get(sourceId) ?? new Set<string>()
    if (track.has(print)) return false
    track.add(print)
    silentLoaded.set(sourceId, track)
  }
  lastPrint.set(sourceId, print)
  return true
}

function checkFetchingSources(byControls: boolean): void {
  const defsPerTag = defsWithRecordChoice()
  for (const source of runtimeSources()) {
    if (!source.loadRelation) continue
    const { row, giver } = chosenRowOfSource(source.id, defsPerTag)

    if (!giver) continue
    if (!mayLoad(source.id, traitOf(row), byControls)) continue
    loadRowsPerRelation(source, source.loadRelation, row)
  }
}

function fetchValueSources(): void {
  for (const source of runtimeSources()) {
    if (!source.getValue) continue
    fetchValueSource(source, source.getValue)
  }
}

function fetchQuerySources(): void {
  for (const source of runtimeSources()) {
    if (!source.query) continue
    fetchQuerySource(source, source.query)
  }
}

export function wireFetchingSources(): void {
  if (wired) return
  wired = true
  onSelectionList(checkFetchingSources)

  onSeData((delivery) => {
    if (!delivery) return
    fetchValueSources()
    fetchQuerySources()
  })

  if (hasSeData()) {
    fetchValueSources()
    fetchQuerySources()
  }
}
