import {
  CELLS_PARAM_SOURCES,
  RECORD_PLACEHOLDER,
  checkParameterBinding,
  type Parameter,
} from '../actions'
import type { Unread } from '../../unread'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface RelationStep extends StepBase {
  kind: 'RELATION'

  relationId: string

  parameter: Parameter[]

  extraParameter: Parameter[]
}

export type RuntimeRelationStep = Omit<RelationStep, 'id'>

function bindingsRead(raw: unknown): Parameter[] | null {
  if (!Array.isArray(raw)) return null
  const params: Parameter[] = []
  for (const value of raw) {
    const binding = checkParameterBinding(value)
    if (!binding) return null
    params.push(binding)
  }
  return params
}

function relationFields(
  raw: Unread<RuntimeRelationStep>,
): { relationId: string; parameter: Parameter[]; extraParameter: Parameter[] } | null {
  if (typeof raw.relationId !== 'string') return null
  const parameter = bindingsRead(raw.parameter)
  const extraParameter = bindingsRead(raw.extraParameter)
  if (!parameter || !extraParameter) return null
  return { relationId: raw.relationId, parameter, extraParameter }
}

function withBindings(step: RelationStep, map: (binding: Parameter) => Parameter): RelationStep {
  const parameter = step.parameter.map(map)
  const extraParameter = step.extraParameter.map(map)
  const changed = parameter.some((b, i) => b !== step.parameter[i])
    || extraParameter.some((b, i) => b !== step.extraParameter[i])
  return changed ? { ...step, parameter, extraParameter } : step
}

export const relation: StepAdapter<'RELATION'> = {
  kind: 'RELATION',
  answers: true,
  read(raw, base) {
    const fields = relationFields(raw)
    return fields && { id: base.id, kind: 'RELATION', resultName: base.resultName, ...fields }
  },
  readExported(raw, resultName) {
    const fields = relationFields(raw)
    return fields && { kind: 'RELATION', resultName, ...fields }
  },
  export(step, refs) {
    const binding = (b: Parameter): Parameter => {
      if (b.source === 'stepResult') return { ...b, value: refs.stepPosition(b.value) }

      if (CELLS_PARAM_SOURCES[b.source] !== undefined) {
        return { ...b, value: refs.columnsIndex(b.blockId ?? '', b.value) }
      }
      return { ...b }
    }
    return {
      kind: step.kind,
      resultName: step.resultName,
      relationId: step.relationId,
      parameter: step.parameter.map(binding),
      extraParameter: step.extraParameter.map(binding),
    }
  },
  async run(step, run) {
    const template = run.host.relation(step.relationId)
    if (!template) return { failed: true }

    const bindings = [...step.parameter, ...step.extraParameter]

    const missingRecord = RECORD_PLACEHOLDER.find((name) =>
      bindings.some((b) => b.source === 'context' && b.value === name)
      && (run.values[name] ?? '') === '')
    if (missingRecord !== undefined) return { failed: true }

    const params = bindings.map((binding) => run.host.resolveParameter(binding, run.parameterValues))
    const answer = await run.host.runRelation(template, params)
    return {
      failed: answer.failed === true,
      answer: { value: answer.value, raw: answer.raw, wrote: template.verb !== 'GET_RELATION' },
    }
  },
  bindings: (step) => [...step.parameter, ...step.extraParameter],
  withBindings,
  withBlockIds(step, newId) {
    return withBindings(step, (b) => {
      const target = b.blockId === undefined || b.blockId === '' ? undefined : newId(b.blockId)
      return target === undefined ? b : { ...b, blockId: target }
    })
  },
  relationId: (step) => step.relationId,
}
