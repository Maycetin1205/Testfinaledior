import {
  checkParameterBinding,
  type Parameter,
  type ParameterSource,
} from './actions'
import { sourceKind, type SourceKindId } from './sourceKinds'

export const GET_VALUE_SOURCES = ['fixed', 'dataField', 'seVariable'] as const

export function getValueSourceAllowed(source: ParameterSource): boolean {
  return source === 'omitted' || (GET_VALUE_SOURCES as readonly string[]).includes(source)
}

export interface GetValue {
  relationId: string

  parameter: readonly Parameter[]
}

export type RuntimeGetValue = GetValue & { fields: readonly string[] }

export function checkGetValue(raw: unknown): GetValue | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const relationId = typeof e.relationId === 'string' ? e.relationId.trim() : ''
  if (relationId === '') return null
  if (!Array.isArray(e.parameter)) return null
  const params: Parameter[] = []
  for (const raw of e.parameter) {
    const binding = checkParameterBinding(raw)

    if (!binding || !getValueSourceAllowed(binding.source)) return null
    params.push(binding)
  }
  return { relationId, parameter: params }
}

export function getValueOf(
  source: { kind: SourceKindId; getValue?: GetValue },
): GetValue | null {
  if (!sourceKind(source.kind).getValuePossible) return null
  return source.getValue ?? null
}

export function sourcesFromGetValue(
  source: { kind: SourceKindId; getValue?: GetValue },
): { sourceId: string; code: string }[] {
  const out: { sourceId: string; code: string }[] = []
  for (const binding of getValueOf(source)?.parameter ?? []) {
    if (binding.source !== 'dataField') continue
    const sourceId = binding.sourceId ?? ''
    if (sourceId !== '') out.push({ sourceId, code: binding.value })
  }
  return out
}
