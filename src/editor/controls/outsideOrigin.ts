import type { MaskTree } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import { valueSpotsInTree } from '../../core/block/treeQuery'
import type { DataSource } from '../../core/data/dataSources'
import type { KeyPair } from '../../core/data/extraSources'
import type { ValueOrigin } from '../../core/data/valueOrigin'
import { blockValueKey } from '../datacenter/parameterText'
import type { OfferEntry, OriginOffer } from './originOffer'

// Where a key takes its value from outside the row: a field of the open
// document or the value of a form field. The key of a helper source and the
// pairs of a follow offer the same.

export interface FormFieldSpot {
  key: string
  blockId: string
  prop: string
  name: string
}

export const openDocumentOf = (library: readonly DataSource[]): DataSource | undefined =>
  library.find((s) => s.preset === 'document')

export const fieldEntries = (source: DataSource | undefined): OfferEntry[] =>
  (source?.fields ?? []).map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code }))

// The form fields of the mask, but for the block that asks.
export function formFieldSpots(tree: MaskTree, library: readonly DataSource[], exceptId = ''): FormFieldSpot[] {
  return valueSpotsInTree(tree)
    .filter(({ node }) => node.id !== exceptId)
    .map(({ node, spot }) => ({
      key: blockValueKey(node.id, spot.prop),
      blockId: node.id,
      prop: spot.prop,
      name: blockName(node, library),
    }))
}

export function outsideOffer(
  library: readonly DataSource[],
  formFields: readonly FormFieldSpot[],
): Pick<OriginOffer, 'document' | 'formFields'> {
  const openDocument = openDocumentOf(library)
  return {
    ...(openDocument
      ? { document: { sourceId: openDocument.id, name: openDocument.name, fields: fieldEntries(openDocument) } }
      : {}),
    formFields: formFields.map((f) => ({ value: f.key, name: f.name })),
  }
}

export const fromOutside = (origin: ValueOrigin): boolean =>
  origin.kind === 'document' || origin.kind === 'formField'

// The origin of a pair that reads the document or a form field; null for any other.
export function outsideOrigin(pair: KeyPair): ValueOrigin | null {
  if (pair.from === 'document') return { kind: 'document', sourceId: pair.fromSourceId ?? '', value: pair.fromField }
  if (pair.from === 'formField') return { kind: 'formField', value: blockValueKey(pair.fromField, pair.fromProp ?? 'value') }
  return null
}

// The pair for a value from the document or a form field; null for a form
// field no longer in the mask.
export function outsidePair(origin: ValueOrigin, toField: string, formFields: readonly FormFieldSpot[]): KeyPair | null {
  if (origin.kind === 'document') {
    return { fromField: origin.value, toField, from: 'document', fromSourceId: origin.sourceId ?? '' }
  }
  const spot = formFields.find((f) => f.key === origin.value)
  return spot ? { fromField: spot.blockId, toField, from: 'formField', fromProp: spot.prop } : null
}
