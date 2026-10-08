import type { Parameter } from './actions'
import type { KeyPair } from './extraSources'

// Where a value comes from. One list for every place that takes a value: the
// places of an action and the value a source fetches with, the key of a helper
// source, the pairs of a follow, the terms of a calculation. Each place offers
// the part of it it can read and keeps its choice in its own stored form, a
// parameter, a key pair or a term; the editor reads and writes them as these.
export type ValueOrigin =
  // A typed value.
  | { kind: 'fixed'; value: string }
  // What the event brings, like the record number.
  | { kind: 'event'; value: string }
  // A column of this row.
  | { kind: 'row'; value: string }
  // A field of a helper source, of the record that fits this row.
  | { kind: 'helper'; sourceId?: string; value: string }
  // A field of the open document.
  | { kind: 'document'; sourceId: string; value: string }
  // A field of a source.
  | { kind: 'source'; sourceId: string; value: string }
  // What a form field holds at one of its spots.
  | { kind: 'formField'; blockId: string; prop: string }
  // A field of the row chosen in a block.
  | { kind: 'chosenRow'; blockId: string; value: string }
  // A column of the row captured or changed in a block.
  | { kind: 'captured'; blockId: string; value: string }
  | { kind: 'changed'; blockId: string; value: string }
  // The answer of a step before, or one field of it.
  | { kind: 'step'; stepId: string; field?: string }
  // Shown, no longer offered: the answer of the step just before, a SoftEngine variable.
  | { kind: 'previous' }
  | { kind: 'variable'; value: string }

export type OriginKind = ValueOrigin['kind']

// ----- a parameter of an action -----

// What a parameter reads; null while its place is left out.
export function parameterOrigin(p: Parameter): ValueOrigin | null {
  switch (p.source) {
    case 'fixed': return { kind: 'fixed', value: p.value }
    case 'context': return { kind: 'event', value: p.value }
    case 'dataField': return { kind: 'source', sourceId: p.sourceId ?? '', value: p.value }
    case 'blockValue': return { kind: 'formField', blockId: p.blockId ?? '', prop: p.value }
    case 'chosenRow': return { kind: 'chosenRow', blockId: p.blockId ?? '', value: p.value }
    case 'captureCell': return { kind: 'captured', blockId: p.blockId ?? '', value: p.value }
    case 'changeCell': return { kind: 'changed', blockId: p.blockId ?? '', value: p.value }
    case 'stepResult': return { kind: 'step', stepId: p.value, ...(p.resultField ? { field: p.resultField } : {}) }
    case 'previousResult': return { kind: 'previous' }
    case 'seVariable': return { kind: 'variable', value: p.value }
    case 'omitted': return null
  }
}

// The parameter that keeps an origin; null for one no action reads.
export function originParameter(o: ValueOrigin): Parameter | null {
  switch (o.kind) {
    case 'fixed': return { source: 'fixed', value: o.value }
    case 'event': return { source: 'context', value: o.value }
    case 'source': return { source: 'dataField', sourceId: o.sourceId, value: o.value }
    case 'formField': return { source: 'blockValue', blockId: o.blockId, value: o.prop }
    case 'chosenRow': return { source: 'chosenRow', blockId: o.blockId, value: o.value }
    case 'captured': return { source: 'captureCell', blockId: o.blockId, value: o.value }
    case 'changed': return { source: 'changeCell', blockId: o.blockId, value: o.value }
    case 'step': return { source: 'stepResult', value: o.stepId, ...(o.field ? { resultField: o.field } : {}) }
    case 'previous': return { source: 'previousResult', value: '' }
    case 'variable': return { source: 'seVariable', value: o.value }
    default: return null
  }
}

// ----- a key pair -----

// What a pair reads: the open document, a form field, or else its partner,
// the row itself, a helper source or the chosen row of the giver. Null while
// its field is still to choose.
export function pairOrigin(pair: KeyPair, partner: (field: string) => ValueOrigin): ValueOrigin | null {
  if (pair.fromField === '') return null
  if (pair.from === 'document') return { kind: 'document', sourceId: pair.fromSourceId ?? '', value: pair.fromField }
  if (pair.from === 'formField') return { kind: 'formField', blockId: pair.fromField, prop: pair.fromProp ?? 'value' }
  return partner(pair.fromField)
}

// The pair that reads an origin into its own field; null for one no pair reads.
export function originPair(o: ValueOrigin, toField: string): KeyPair | null {
  switch (o.kind) {
    case 'document': return { fromField: o.value, toField, from: 'document', fromSourceId: o.sourceId }
    case 'formField': return { fromField: o.blockId, toField, from: 'formField', fromProp: o.prop }
    case 'row':
    case 'helper':
    case 'chosenRow':
      return { fromField: o.value, toField }
    default: return null
  }
}
