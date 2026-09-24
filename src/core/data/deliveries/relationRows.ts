import { isSeObject } from '../actions'
import { POS_LEN } from '../sourceInput'
import type { DeliveryAdapter } from './deliveryAdapter'

// The Hol-Relation: the mask asks for the positions of the document chosen at
// the giver, one question per position.
export interface LoadRelation {
  nr: string

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

const ONLY_DIGITS = /^\d+$/

const LOAD_CUT_LEN = 255

export function fieldsBehindCut(used: ReadonlySet<string> | undefined): string[] {
  const out: string[] = []
  for (const code of used ?? []) {
    const m = /^(\d+)_(\d+)$/.exec(code)
    if (!m) continue
    if (Number(m[1]) + Number(m[2]) > LOAD_CUT_LEN) out.push(code)
  }
  return out.sort((a, b) => {
    const [posA = 0, lenA = 0] = a.split('_').map(Number)
    const [posB = 0, lenB = 0] = b.split('_').map(Number)
    return posA - posB || lenA - lenB
  })
}

export function relationNrFromInput(raw: string): string {
  const t = raw.trim()
  return ONLY_DIGITS.test(t) ? t : ''
}

export function checkLoadRelation(raw: unknown): LoadRelation | null {
  if (!isSeObject(raw)) return null
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const nr = text(raw.nr)
  const documentKindField = text(raw.documentKindField)
  const documentNumberField = text(raw.documentNumberField)
  const yearField = text(raw.yearField)
  const archiveField = text(raw.archiveField)
  const endFields = Array.isArray(raw.endFields)
    ? raw.endFields.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
    : []
  if (!ONLY_DIGITS.test(nr)) return null
  if (!POS_LEN.test(documentKindField) || !POS_LEN.test(documentNumberField)) return null
  if (yearField !== '' && !POS_LEN.test(yearField)) return null
  if (archiveField !== '' && !POS_LEN.test(archiveField)) return null
  if (endFields.length === 0) return null
  return { nr, documentKindField, documentNumberField, yearField, archiveField, endFields }
}

export const relationRows: DeliveryAdapter<'relationRows'> = {
  kind: 'relationRows',
  read(raw) {
    const load = checkLoadRelation(raw)
    return load && { kind: 'relationRows', ...load }
  },
  needsTable: false,
  fetchOn: 'selection',
  export: (delivery, _, context) => ({
    loadRelation: {
      nr: delivery.nr,
      documentKindField: delivery.documentKindField,
      documentNumberField: delivery.documentNumberField,
      yearField: delivery.yearField,
      archiveField: delivery.archiveField,
      endFields: delivery.endFields,
      extraFields: fieldsBehindCut(context.used),
    },
  }),
  readExported(entry) {
    const raw = entry.loadRelation
    const load = checkLoadRelation(raw)
    if (!load || !isSeObject(raw)) return null
    const extraFields = Array.isArray(raw.extraFields)
      ? raw.extraFields.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
      : []
    return { kind: 'relationRows', load: { ...load, extraFields } }
  },
  relationIds: () => [],
  bindings: () => [],
  giverFields: (delivery) => [
    delivery.documentKindField, delivery.documentNumberField, delivery.yearField, delivery.archiveField,
  ],
}
