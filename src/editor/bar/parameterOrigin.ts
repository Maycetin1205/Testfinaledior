import type { Parameter } from '../../core/data/actions'
import type { DataSource } from '../../core/data/dataSources'
import type { ValueOrigin } from '../../core/data/valueOrigin'
import type { OfferSource, OriginOffer } from '../controls/originOffer'
import type { ParameterChoices } from '../datacenter/parameter/choices'

// Which row a row origin reads: the chosen row of a block, or the rows a
// capture has captured or changed.
const ROW_SOURCES = { chosen: 'chosenRow', captured: 'captureCell', changed: 'changeCell' } as const
type RowKind = keyof typeof ROW_SOURCES

const rowId = (kind: RowKind, blockId: string): string => `${kind}:${blockId}`

const isDocument = (source: DataSource): boolean => source.preset === 'document'

const fieldsOf = (s: DataSource) => s.fields.map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code }))

// The origins an action's parameter can take: the rows of the mask's lists,
// the fields of its sources, the open document, the form fields, a fixed value.
export function parameterOffer(choices: ParameterChoices): OriginOffer {
  const rows = (kind: RowKind, word: string, list: ParameterChoices['captures']): OfferSource[] =>
    list.map((c) => ({
      sourceId: rowId(kind, c.blockId),
      name: `${word} ${c.label}`,
      fields: c.columns.map((s) => ({ value: s.key, name: s.title || s.key })),
    }))
  const openDocument = choices.dataSources.find(isDocument)
  return {
    rows: [
      ...choices.giver.map((g) => ({
        sourceId: rowId('chosen', g.blockId),
        name: `Gewählte Zeile ${g.label}`,
        fields: g.fields.map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code })),
      })),
      ...rows('captured', 'Erfasste Zeilen', choices.captures),
      ...rows('changed', 'Geänderte Zeilen', choices.changes),
    ],
    helpers: choices.dataSources
      .filter((s) => !isDocument(s))
      .map((s) => ({ sourceId: s.id, name: s.name, fields: fieldsOf(s) })),
    ...(openDocument ? { document: { sourceId: openDocument.id, name: openDocument.name, fields: fieldsOf(openDocument) } } : {}),
    formFields: choices.blockValues.map((b) => ({ value: b.key, name: b.label })),
    fixed: true,
  }
}

// A parameter as an origin; null for what only the relation fills, like the
// record number of the event.
export function originOfParameter(binding: Parameter, choices: ParameterChoices): ValueOrigin | null {
  switch (binding.source) {
    case 'fixed':
      return binding.value === '' ? null : { kind: 'fixed', value: binding.value }
    case 'dataField': {
      const source = choices.dataSources.find((s) => s.id === binding.sourceId)
      if (binding.value === '') return null
      return { kind: source && isDocument(source) ? 'document' : 'helper', sourceId: binding.sourceId ?? '', value: binding.value }
    }
    case 'blockValue': {
      const spot = choices.blockValues.find((b) => b.blockId === binding.blockId && b.prop === binding.value)
      return spot ? { kind: 'formField', value: spot.key } : null
    }
    case 'chosenRow':
    case 'captureCell':
    case 'changeCell': {
      const kind = (Object.keys(ROW_SOURCES) as RowKind[]).find((k) => ROW_SOURCES[k] === binding.source)
      if (kind === undefined || binding.value === '') return null
      return { kind: 'row', sourceId: rowId(kind, binding.blockId ?? ''), value: binding.value }
    }
    default:
      return null
  }
}

// The record numbers a relation fills itself; every other value the builder
// may choose, the value of the event too.
export function choosable(binding: Parameter): boolean {
  if (binding.source === 'context') return binding.value === 'VALUE' || binding.value === 'NOW_DATE'
  return ['fixed', 'dataField', 'blockValue', 'chosenRow', 'captureCell', 'changeCell'].includes(binding.source)
}

export function parameterOfOrigin(origin: ValueOrigin, choices: ParameterChoices): Parameter | null {
  switch (origin.kind) {
    case 'fixed':
      return { source: 'fixed', value: origin.value }
    case 'helper':
    case 'document':
      return { source: 'dataField', sourceId: origin.sourceId ?? '', value: origin.value }
    case 'formField': {
      const spot = choices.blockValues.find((b) => b.key === origin.value)
      return spot ? { source: 'blockValue', blockId: spot.blockId, value: spot.prop } : null
    }
    case 'row': {
      const [kind, blockId] = (origin.sourceId ?? '').split(/:(.*)/s) as [RowKind, string]
      const source = ROW_SOURCES[kind]
      return source === undefined ? null : { source, blockId, value: origin.value }
    }
  }
}
