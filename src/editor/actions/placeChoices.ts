import type { ListGroup } from '@/editor/widgets/List'
import { blockName } from '../../core/block/blockName'
import { capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import type { BlockNode, MaskTree } from '../../core/block/tree'
import {
  captureCarrierInTree,
  changeCarrierInTree,
  deleteCarrierInTree,
  selectionGiverInTree,
  selectionSourceIdOf,
  valueSpotsInTree,
} from '../../core/block/treeQuery'
import { ACTION_PLACEHOLDER, type Parameter } from '../../core/data/actions'
import type { DataField, DataSource } from '../../core/data/dataSources'
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
  deletions: readonly Rows[]
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

// Everything an action of this mask can read.
export function maskChoices(tree: MaskTree, sources: readonly DataSource[]): Omit<PlaceChoices, 'steps'> {
  return {
    events: true,
    dataSources: sources,
    formFields: valueSpotsInTree(tree).map(({ node, spot }) => {
      const name = blockName(node, sources)
      const several = (capability(blockType(node.type), 'actionValue')?.spots.length ?? 0) > 1
      return { blockId: node.id, prop: spot.prop, name: several ? `${name} — ${spot.name}` : name }
    }),
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
    deletions: rowsOf(deleteCarrierInTree(tree), sources),
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
    deletions: [],
    steps: [],
  }
}

// What a place shows: the entry in plain words, and where it comes from.
export interface PlaceText {
  entry: string
  origin: string
}

// fieldName: the field whose position and length stand typed in the places.
export function placeText(b: Parameter, raw: string, choices: PlaceChoices, fieldName: string | undefined): PlaceText {
  const rowsOfKind = b.source === 'captureCell' ? choices.captures
    : b.source === 'changeCell' ? choices.changes : choices.deletions
  switch (b.source) {
    case 'fixed':
      if (b.value.trim() === '') return { entry: '', origin: '' }
      return { entry: b.value, origin: parameterRole(raw) !== null && fieldName ? `Feld ${fieldName}` : 'fester Wert' }
    case 'context':
      return { entry: EVENT_VALUES[b.value] ?? b.value, origin: 'Ereignis' }
    case 'dataField': {
      const source = choices.dataSources.find((s) => s.id === b.sourceId)
      return { entry: source?.fields.find((f) => f.code === b.value)?.name ?? b.value, origin: source?.name ?? '' }
    }
    case 'blockValue': {
      const spot = choices.formFields.find((f) => f.blockId === b.blockId && f.prop === b.value)
      return { entry: spot?.name ?? b.value, origin: 'Formularfeld' }
    }
    case 'chosenRow': {
      const giver = choices.givers.find((g) => g.blockId === b.blockId)
      return {
        entry: giver?.fields.find((f) => f.code === b.value)?.name ?? b.value,
        origin: giver ? `Gewählte Zeile ${giver.name}` : 'Gewählte Zeile',
      }
    }
    case 'captureCell':
    case 'changeCell':
    case 'deleteCell': {
      const column = rowsOfKind.find((r) => r.blockId === b.blockId)?.columns.find((c) => c.key === b.value)
      const word = b.source === 'captureCell' ? 'Erfasste Zeile'
        : b.source === 'changeCell' ? 'Geänderte Zeile' : 'Gelöschte Zeile'
      return { entry: column?.title ?? b.value, origin: word }
    }
    case 'stepResult': {
      const step = choices.steps.find((s) => s.id === b.value)
      const field = b.resultField ?? ''
      return {
        entry: step ? `Schritt ${step.nr}${field === '' ? '' : `, Feld ${field}`}` : '',
        origin: 'Ergebnis',
      }
    }
    case 'previousResult':
      return { entry: 'Schritt davor', origin: 'Ergebnis' }
    case 'seVariable':
      return { entry: b.value, origin: 'VAR' }
    case 'omitted':
      return { entry: '', origin: '' }
  }
}

// A chosen entry of a place's list: a value for the place, or a field whose
// position and length fill every place that asks for them.
export type PlacePick = { set: Parameter } | { adopt: { sourceId: string; code: string } }

const pick = (p: PlacePick): string => JSON.stringify(p)

export const placePicked = (value: string): PlacePick => JSON.parse(value) as PlacePick

// What a place can take: for position, length and table a field of a source;
// else a value of the event, a row of a list, a field of a source, a form
// field, the result of a step before.
export function placeGroups(raw: string, choices: PlaceChoices): ListGroup[] {
  const sources = choices.dataSources
  if (parameterRole(raw) !== null) {
    const fields = adoptFields(sources)
    return sources
      .map((s) => ({
        key: `adopt:${s.id}`,
        name: s.name,
        entries: fields.filter((f) => f.sourceId === s.id)
          .map((f) => ({ value: pick({ adopt: { sourceId: s.id, code: f.code } }), name: f.label, badge: f.code })),
      }))
      .filter((g) => g.entries.length > 0)
  }
  const rows = (word: string, kind: 'captureCell' | 'changeCell' | 'deleteCell', list: readonly Rows[]): ListGroup[] =>
    list.map((r) => ({
      key: `${kind}:${r.blockId}`,
      name: word,
      badge: r.name,
      entries: r.columns.map((c) => ({ value: pick({ set: { source: kind, blockId: r.blockId, value: c.key } }), name: c.title || c.key })),
    }))
  const groups: ListGroup[] = [
    ...(choices.events
      ? [{
          key: 'event',
          name: 'Ereignis',
          entries: ACTION_PLACEHOLDER.map((key) => ({
            value: pick({ set: { source: 'context', value: key } }),
            name: EVENT_VALUES[key] ?? key,
          })),
        }]
      : []),
    ...choices.givers.map((g) => ({
      key: `chosenRow:${g.blockId}`,
      name: 'Gewählte Zeile',
      badge: g.name,
      entries: g.fields.map((f) => ({
        value: pick({ set: { source: 'chosenRow', blockId: g.blockId, value: f.code } }),
        name: f.name || f.code,
        badge: f.code,
      })),
    })),
    ...rows('Erfasste Zeilen', 'captureCell', choices.captures),
    ...rows('Geänderte Zeilen', 'changeCell', choices.changes),
    ...rows('Gelöschte Zeilen', 'deleteCell', choices.deletions),
    ...sources.map((s) => ({
      key: `dataField:${s.id}`,
      name: s.name,
      entries: s.fields.map((f) => ({
        value: pick({ set: { source: 'dataField', sourceId: s.id, value: f.code } }),
        name: f.name || f.code,
        badge: f.code,
      })),
    })),
    {
      key: 'formField',
      name: 'Formularfeld',
      entries: choices.formFields.map((f) => ({
        value: pick({ set: { source: 'blockValue', blockId: f.blockId, value: f.prop } }),
        name: f.name,
      })),
    },
    {
      key: 'stepResult',
      name: 'Ergebnis',
      entries: choices.steps.map((s) => ({
        value: pick({ set: { source: 'stepResult', value: s.id } }),
        name: `Schritt ${s.nr}: ${s.name}`,
      })),
    },
  ]
  return groups.filter((g) => g.entries.length > 0)
}
