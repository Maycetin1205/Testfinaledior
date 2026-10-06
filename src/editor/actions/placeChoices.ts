import type { ListGroup } from '@/editor/widgets/List'
import { blockName } from '../../core/block/blockName'
import { capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import type { BlockNode, MaskTree } from '../../core/block/tree'
import {
  captureCarrierInTree,
  changeCarrierInTree,
  selectionGiverInTree,
  selectionSourceIdOf,
  valueSpotsInTree,
} from '../../core/block/treeQuery'
import { ACTION_PLACEHOLDER, type Parameter } from '../../core/data/actions'
import { fieldOf, type DataField, type DataSource } from '../../core/data/dataSources'
import { parameterRole } from '../../core/data/relations'
import type { ResultStep } from '../../core/data/steps/chains'
import { adoptFields } from './fieldAdopt'

interface FormField {
  blockId: string
  prop: string
  name: string
}

interface Giver {
  blockId: string
  name: string
  fields: readonly DataField[]
}

interface Rows {
  blockId: string
  name: string
  columns: readonly { key: string; title: string }[]
}

// What the places of a relation can read: the values of the event, the rows of
// the mask's lists, the fields of the sources, the form fields, the results of
// the steps before.
export interface PlaceChoices {
  events: boolean
  dataSources: readonly DataSource[]
  formFields: readonly FormField[]
  givers: readonly Giver[]
  captures: readonly Rows[]
  changes: readonly Rows[]
  steps: readonly ResultStep[]
}

const EVENT_VALUES: Readonly<Record<string, string>> = {
  PINDEX: 'Satznummer',
  DROP_PINDEX: 'Satznummer der Löschung',
  VALUE: 'Wert',
  NOW_DATE: 'Heutiges Datum',
}

function rowsOf(carrier: readonly BlockNode[], sources: readonly DataSource[]): Rows[] {
  return carrier.map((node) => {
    const binding = capability(blockType(node.type), 'list')?.binding
    const keyOf = binding?.keyOf
    const columns = binding && keyOf !== undefined
      ? binding.entries(node.values[binding.prop]).flatMap((entry) => {
          const key = keyOf(entry)
          if (key === '') return []
          const title = binding.titleOf(entry)
          return [{ key, title: title !== '' ? title : binding.defaultTitle }]
        })
      : []
    return { blockId: node.id, name: blockName(node, sources), columns }
  })
}

// Form fields of the same name are told apart by a number behind it.
function numbered(fields: readonly FormField[]): FormField[] {
  return fields.map((f) => {
    const same = fields.filter((o) => o.name === f.name)
    return same.length > 1 ? { ...f, name: `${f.name} ${same.indexOf(f) + 1}` } : f
  })
}

// Everything an action of this mask can read.
export function maskChoices(tree: MaskTree, sources: readonly DataSource[]): Omit<PlaceChoices, 'steps'> {
  return {
    events: true,
    dataSources: sources,
    formFields: numbered(valueSpotsInTree(tree).map(({ node, spot }) => {
      const name = blockName(node, sources)
      const several = (capability(blockType(node.type), 'actionValue')?.spots.length ?? 0) > 1
      return { blockId: node.id, prop: spot.prop, name: several ? `${name} — ${spot.name}` : name }
    })),
    givers: selectionGiverInTree(tree).map((node) => {
      const source = sources.find((s) => s.id === selectionSourceIdOf(node))
      return {
        blockId: node.id,
        name: source ? `${blockName(node, sources)} (${source.name})` : blockName(node, sources),
        fields: source?.fields ?? [],
      }
    }),
    captures: rowsOf(captureCarrierInTree(tree), sources),
    changes: rowsOf(changeCarrierInTree(tree), sources),
  }
}

// What the value a source fetches can read: a typed value or a field of
// another source.
export function sourceChoices(sources: readonly DataSource[], exceptId: string): PlaceChoices {
  return {
    events: false,
    dataSources: sources.filter((s) => s.id !== exceptId),
    formFields: [],
    givers: [],
    captures: [],
    changes: [],
    steps: [],
  }
}

// What stands in a place, in plain words: the typed value, or the name of the
// field, column or value it reads.
export function placeEntry(b: Parameter, choices: PlaceChoices): string {
  const rowsOfKind = b.source === 'captureCell' ? choices.captures : choices.changes
  switch (b.source) {
    case 'fixed':
    case 'seVariable':
      return b.value
    case 'context':
      return EVENT_VALUES[b.value] ?? b.value
    case 'dataField':
      return fieldOf(choices.dataSources.find((s) => s.id === b.sourceId), b.value)?.name ?? b.value
    case 'blockValue':
      return choices.formFields.find((f) => f.blockId === b.blockId && f.prop === b.value)?.name ?? b.value
    case 'chosenRow':
      return choices.givers.find((g) => g.blockId === b.blockId)?.fields.find((f) => f.code === b.value)?.name ?? b.value
    case 'captureCell':
    case 'changeCell':
      return rowsOfKind.find((r) => r.blockId === b.blockId)?.columns.find((c) => c.key === b.value)?.title ?? b.value
    case 'stepResult':
      return b.resultField ? `Feld ${b.resultField}` : 'Antwort'
    case 'previousResult':
      return 'Antwort'
    case 'omitted':
      return ''
  }
}

// What the column "Eingabe" shows: a form field, named in "Herkunft", gives
// its content.
export function entryText(b: Parameter, choices: PlaceChoices): string {
  return b.source === 'blockValue' ? 'Inhalt' : placeEntry(b, choices)
}

// Where a place takes its value from, as a key: fixed, event, a block's rows,
// the form fields, a step, a source, or a source whose field fills position,
// length and table. Empty while the place is empty.
export function originOf(b: Parameter, raw: string, adopted: { sourceId: string } | undefined): string {
  switch (b.source) {
    case 'fixed':
      if (b.value.trim() === '') return ''
      return parameterRole(raw) !== null && adopted ? `adopt:${adopted.sourceId}` : 'fixed'
    case 'omitted':
      return ''
    case 'context':
      return 'event'
    case 'captureCell':
      return `capture:${b.blockId ?? ''}`
    case 'changeCell':
      return `change:${b.blockId ?? ''}`
    case 'chosenRow':
      return `giver:${b.blockId ?? ''}`
    case 'blockValue':
      return `formField:${b.blockId ?? ''}:${b.value}`
    case 'stepResult':
      return `step:${b.value}`
    case 'dataField':
      return `source:${b.sourceId ?? ''}`
    case 'previousResult':
      return 'previous'
    case 'seVariable':
      return 'var'
  }
}

const split = (origin: string): [string, string] => {
  const at = origin.indexOf(':')
  return at < 0 ? [origin, ''] : [origin.slice(0, at), origin.slice(at + 1)]
}

// The origin in a few words, as the column "Herkunft" shows it.
export function originName(origin: string, choices: PlaceChoices, adoptedLabel?: string): string {
  const [kind, id] = split(origin)
  const nameIn = (list: readonly { blockId: string; name: string }[]) => list.find((x) => x.blockId === id)?.name ?? ''
  const formField = () => choices.formFields.find((f) => `${f.blockId}:${f.prop}` === id)
  switch (kind) {
    case 'fixed': return 'Fest'
    case 'event': return 'Ereignis'
    case 'capture': return `Erfasste Zeile: ${nameIn(choices.captures)}`
    case 'change': return `Geänderte Zeile: ${nameIn(choices.changes)}`
    case 'giver': return `Gewählte Zeile: ${nameIn(choices.givers)}`
    case 'formField': return formField()?.name ?? ''
    case 'step': {
      const step = choices.steps.find((s) => s.id === id)
      return step ? `Schritt ${step.nr}: ${step.name}` : 'Schritt'
    }
    case 'previous': return 'Schritt davor'
    case 'var': return 'VAR'
    case 'source': return choices.dataSources.find((s) => s.id === id)?.name ?? ''
    case 'adopt': {
      const source = choices.dataSources.find((s) => s.id === id)?.name ?? ''
      return adoptedLabel ? `${source}: ${adoptedLabel}` : source
    }
    default: return ''
  }
}

// What a place can take its value from: a short list of only what this mask
// has, each form field by its own name. Position, length and table take a
// field of a source, which fills all three. The sources stand in a group of
// their own.
export function originGroups(raw: string, choices: PlaceChoices): ListGroup[] {
  const sources = choices.dataSources
  const entry = (value: string) => ({ value, name: originName(value, choices) })
  if (parameterRole(raw) !== null) {
    const fields = adoptFields(sources)
    return [
      { key: 'fixed', entries: [entry('fixed')] },
      {
        key: 'adopt',
        name: 'Feld einer Quelle',
        entries: sources.filter((s) => fields.some((f) => f.sourceId === s.id)).map((s) => entry(`adopt:${s.id}`)),
      },
    ].filter((g) => g.entries.length > 0)
  }
  const blocks = [
    ...choices.captures.map((r) => entry(`capture:${r.blockId}`)),
    ...choices.changes.map((r) => entry(`change:${r.blockId}`)),
    ...choices.givers.map((g) => entry(`giver:${g.blockId}`)),
    ...choices.steps.map((s) => entry(`step:${s.id}`)),
  ]
  return [
    { key: 'fixed', entries: [entry('fixed'), ...(choices.events ? [entry('event')] : [])] },
    { key: 'mask', name: 'Maske', entries: blocks },
    { key: 'formFields', name: 'Formularfelder', entries: choices.formFields.map((f) => entry(`formField:${f.blockId}:${f.prop}`)) },
    { key: 'sources', name: 'Quelle', entries: sources.filter((s) => s.fields.length > 0).map((s) => entry(`source:${s.id}`)) },
  ].filter((g) => g.entries.length > 0)
}

// A chosen entry: a value for the place, or a field whose position and length
// fill every place that asks for them.
type PlacePick = { set: Parameter } | { adopt: { sourceId: string; code: string } }

const pick = (p: PlacePick): string => JSON.stringify(p)

export const placePicked = (value: string): PlacePick => JSON.parse(value) as PlacePick

// What one origin offers for the column "Eingabe": only its own fields,
// columns or values. A step offers its whole answer.
export function originEntries(origin: string, choices: PlaceChoices): ListGroup[] {
  const [kind, id] = split(origin)
  const set = (b: Parameter, name: string, badge?: string) => ({ value: pick({ set: b }), name, ...(badge ? { badge } : {}) })
  const rows = (list: readonly Rows[], source: 'captureCell' | 'changeCell') =>
    (list.find((r) => r.blockId === id)?.columns ?? []).map((c) => set({ source, blockId: id, value: c.key }, c.title || c.key))
  const entries = (() => {
    switch (kind) {
      case 'event':
        return ACTION_PLACEHOLDER.map((key) => set({ source: 'context', value: key }, EVENT_VALUES[key] ?? key))
      case 'capture': return rows(choices.captures, 'captureCell')
      case 'change': return rows(choices.changes, 'changeCell')
      case 'giver':
        return (choices.givers.find((g) => g.blockId === id)?.fields ?? [])
          .map((f) => set({ source: 'chosenRow', blockId: id, value: f.code }, f.name || f.code, f.code))
      case 'formField':
        return choices.formFields.filter((f) => `${f.blockId}:${f.prop}` === id)
          .map((f) => set({ source: 'blockValue', blockId: f.blockId, value: f.prop }, 'Inhalt'))
      case 'step':
        return [set({ source: 'stepResult', value: id }, 'Antwort')]
      case 'source':
        return (choices.dataSources.find((s) => s.id === id)?.fields ?? [])
          .map((f) => set({ source: 'dataField', sourceId: id, value: f.code }, f.name || f.code, f.code))
      case 'adopt':
        return adoptFields(choices.dataSources).filter((f) => f.sourceId === id)
          .map((f) => ({ value: pick({ adopt: { sourceId: id, code: f.code } }), name: f.label, badge: f.code }))
      default:
        return []
    }
  })()
  return entries.length > 0 ? [{ key: origin, entries }] : []
}
