import type { BlockType } from '../../core/block/blockType'
import type { PropertyValue } from '../../core/block/property'
import { capability, hasCapability } from '../../core/block/capability'
import { allBlockTypes } from '../../core/block/registry'
import { propertyVisible } from '../../core/block/property'
import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { BLOCK_ID_ATTR } from '../../core/data/actions'
import { holeQuerySource } from '../../softengine/queryLoader'
import { hasSeData, onSeData } from '../../softengine/bridge'
import { runtimeSources } from '../../softengine/runtimeSources'
import { reportError } from '../../softengine/report'
import { loadRowsPerRelation } from '../../softengine/relationLoader'
import { holeValueSource } from '../../softengine/valueLoader'
import {
  onSelectionList,
  selectionFor,
  selectionGiverOf,
  selectionNumber,
  traitOf,
} from './selection'

const lastPrint = new Map<string, string>()

const silentLoaded = new Map<string, Set<string>>()

const withoutGiverReported = new Set<string>()
let wired = false

export function defsWithRecordChoice(): Map<string, BlockType> {
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

export function chosenRowTheSource(
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

export function mayLoad(sourceId: string, print: string, byControls: boolean): boolean {
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
    const { row, giver } = chosenRowTheSource(source.id, defsPerTag)

    if (!giver) {
      if (!withoutGiverReported.has(source.id)) {
        withoutGiverReported.add(source.id)
        reportError(
          `„${source.name}" holt ihre Zeilen erst auf einen Klick hin, aber an keinem `
          + 'Baustein mit dieser Quelle steht, wessen Auswahl er folgt. '
          + 'Im Editor am Baustein unter „Auswahl folgen" die Belegliste wählen.',
        )
      }
      continue
    }
    if (!mayLoad(source.id, traitOf(row), byControls)) continue
    loadRowsPerRelation(source, source.loadRelation, row)
  }
}

function holeValueSources(): void {
  for (const source of runtimeSources()) {
    if (!source.getValue) continue
    holeValueSource(source, source.getValue)
  }
}

function holeQuerySources(): void {
  for (const source of runtimeSources()) {
    if (!source.query) continue
    holeQuerySource(source, source.query)
  }
}

export function wireFetchingSources(): void {
  if (wired) return
  wired = true
  onSelectionList(checkFetchingSources)

  onSeData((delivery) => {
    if (!delivery) return
    holeValueSources()
    holeQuerySources()
  })

  if (hasSeData()) {
    holeValueSources()
    holeQuerySources()
  }
}
