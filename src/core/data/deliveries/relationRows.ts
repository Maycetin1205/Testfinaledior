import { isSeObject } from '../actions'
import { POS_LEN } from '../sourceInput'
import type { DeliveryAdapter } from './deliveryAdapter'

// The Hol-Relation: the mask asks for the positions of the document chosen at
// the giver, one question per position, with a catalog entry that knows its
// slots.
export interface LoadRelation {
  relationId: string

  documentKindField: string
  documentNumberField: string

  yearField: string
  archiveField: string

  endFields: readonly string[]
}

export interface RelationRowsDelivery extends LoadRelation {
  kind: 'relationRows'
}

export type RuntimeLoadRelation = LoadRelation & { extraFields: readonly string[] }

export interface RuntimeRelationRowsDelivery {
  kind: 'relationRows'
  load: RuntimeLoadRelation
}

function fieldsBehindCut(
  used: ReadonlySet<string> | undefined,
  answerLength: number,
): string[] {
  const out: string[] = []
  for (const code of used ?? []) {
    const m = /^(\d+)_(\d+)$/.exec(code)
    if (!m) continue
    if (Number(m[1]) + Number(m[2]) > answerLength) out.push(code)
  }
  return out.sort((a, b) => {
    const [posA = 0, lenA = 0] = a.split('_').map(Number)
    const [posB = 0, lenB = 0] = b.split('_').map(Number)
    return posA - posB || lenA - lenB
  })
}

export function checkLoadRelation(raw: unknown): LoadRelation | null {
  if (!isSeObject(raw)) return null
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const relationId = text(raw.relationId)
  const documentKindField = text(raw.documentKindField)
  const documentNumberField = text(raw.documentNumberField)
  const yearField = text(raw.yearField)
  const archiveField = text(raw.archiveField)
  const endFields = Array.isArray(raw.endFields)
    ? raw.endFields.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
    : []
  if (relationId === '') return null
  if (!POS_LEN.test(documentKindField) || !POS_LEN.test(documentNumberField)) return null
  if (yearField !== '' && !POS_LEN.test(yearField)) return null
  if (archiveField !== '' && !POS_LEN.test(archiveField)) return null
  if (endFields.length === 0) return null
  return { relationId, documentKindField, documentNumberField, yearField, archiveField, endFields }
}

export const relationRows: DeliveryAdapter<'relationRows'> = {
  kind: 'relationRows',
  read(raw) {
    const load = checkLoadRelation(raw)
    return load && { kind: 'relationRows', ...load }
  },
  needsTable: false,
  fetchOn: 'selection',
  export(delivery, _, context) {
    const answerLength = context.relations.find((r) => r.id === delivery.relationId)?.positions?.answerLength
    return {
      loadRelation: {
        relationId: delivery.relationId,
        documentKindField: delivery.documentKindField,
        documentNumberField: delivery.documentNumberField,
        yearField: delivery.yearField,
        archiveField: delivery.archiveField,
        endFields: delivery.endFields,
        extraFields: answerLength === undefined ? [] : fieldsBehindCut(context.usedFields, answerLength),
      },
    }
  },
  readExported(entry) {
    const raw = entry.loadRelation
    const load = checkLoadRelation(raw)
    if (!load || !isSeObject(raw)) return null
    const extraFields = Array.isArray(raw.extraFields)
      ? raw.extraFields.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
      : []
    return { kind: 'relationRows', load: { ...load, extraFields } }
  },
  relationIds: (delivery) => [delivery.relationId],
  bindings: () => [],
  giverFields: (delivery) => [
    delivery.documentKindField, delivery.documentNumberField, delivery.yearField, delivery.archiveField,
  ],
}
