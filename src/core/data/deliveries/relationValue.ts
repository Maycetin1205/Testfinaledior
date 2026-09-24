import { checkParameterBinding, isSeObject, type Parameter, type ParameterSource } from '../actions'
import type { DeliveryAdapter } from './deliveryAdapter'

// One row from the answer of a GET relation, asked after every delivery.
export interface GetValue {
  relationId: string

  parameter: readonly Parameter[]
}

export interface RelationValueDelivery extends GetValue {
  kind: 'relationValue'
}

export type RuntimeGetValue = GetValue & { fields: readonly string[] }

export interface RuntimeRelationValueDelivery {
  kind: 'relationValue'
  get: RuntimeGetValue
}

export const GET_VALUE_SOURCES = ['fixed', 'dataField', 'seVariable'] as const

export function getValueSourceAllowed(source: ParameterSource): boolean {
  return source === 'omitted' || (GET_VALUE_SOURCES as readonly string[]).includes(source)
}

export function checkGetValue(raw: unknown): GetValue | null {
  if (!isSeObject(raw)) return null
  const relationId = typeof raw.relationId === 'string' ? raw.relationId.trim() : ''
  if (relationId === '') return null
  if (!Array.isArray(raw.parameter)) return null
  const params: Parameter[] = []
  for (const entry of raw.parameter) {
    const binding = checkParameterBinding(entry)

    if (!binding || !getValueSourceAllowed(binding.source)) return null
    params.push(binding)
  }
  return { relationId, parameter: params }
}

export const relationValue: DeliveryAdapter<'relationValue'> = {
  kind: 'relationValue',
  read(raw) {
    const get = checkGetValue(raw)
    return get && { kind: 'relationValue', ...get }
  },
  needsTable: false,
  fetchOn: 'delivery',
  export: (delivery, source) => ({
    getValue: {
      relationId: delivery.relationId,
      parameter: delivery.parameter,
      fields: source.fields.map((f) => f.code),
    },
  }),
  readExported(entry) {
    const raw = entry.getValue
    const get = checkGetValue(raw)
    if (!get || !isSeObject(raw)) return null
    const fields = Array.isArray(raw.fields)
      ? raw.fields.filter((f): f is string => typeof f === 'string' && f !== '')
      : []
    return { kind: 'relationValue', get: { ...get, fields } }
  },
  relationIds: (delivery) => [delivery.relationId],
  bindings: (delivery) => delivery.parameter,
  giverFields: () => [],
}
