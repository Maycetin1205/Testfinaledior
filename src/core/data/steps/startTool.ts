import { ACTION_PLACEHOLDER } from '../actions'
import { placeholderInsert, unknownPlaceholder } from '../relations'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface StartToolStep extends StepBase {
  kind: 'START_TOOL'
  toolNumber: string
  toolParameter: string[]
}

export type RuntimeStartToolStep = Omit<StartToolStep, 'id'>

function toolFields(raw: Readonly<Record<string, unknown>>): { toolNumber: string; toolParameter: string[] } | null {
  if (typeof raw.toolNumber !== 'string' || !Array.isArray(raw.toolParameter)) return null
  const toolParameter = raw.toolParameter.filter((p): p is string => typeof p === 'string')
  if (toolParameter.length !== raw.toolParameter.length) return null
  return { toolNumber: raw.toolNumber, toolParameter }
}

export const startTool: StepAdapter<'START_TOOL'> = {
  kind: 'START_TOOL',
  name: 'START_TOOL',
  answers: false,
  read(raw, base) {
    const fields = toolFields(raw)
    return fields && { id: base.id, kind: 'START_TOOL', resultName: base.resultName, ...fields }
  },
  readExported(raw, resultName) {
    const fields = toolFields(raw)
    return fields && { kind: 'START_TOOL', resultName, ...fields }
  },
  export(step) {
    return {
      kind: step.kind,
      resultName: step.resultName,
      toolNumber: step.toolNumber,
      toolParameter: [...step.toolParameter],
    }
  },
  check(step) {
    if (step.toolNumber.trim() === '') return 'Schritt "START_TOOL" hat keine Nummer.'
    if (step.toolParameter.some((param) => param.trim() === '')) {
      return 'Schritt "START_TOOL" hat einen leeren Parameter.'
    }
    const unknown = step.toolParameter.flatMap((param) => unknownPlaceholder(param, ACTION_PLACEHOLDER))
    if (unknown.length > 0) return 'Schritt "START_TOOL" hat einen unbekannten Platzhalter.'
    return null
  },
  run(step, run) {
    const sent = run.host.sendStartTool(
      step.toolNumber, placeholderInsert({ parameter: step.toolParameter }, run.values),
    )
    return Promise.resolve({ failed: !sent })
  },
  summary(step) {
    return {
      what: 'START_TOOL',
      detail: step.toolNumber.trim() !== '' ? ` — Nr. ${step.toolNumber}` : '',
      target: '',
      origin: '',
      table: '',
    }
  },
  form: {
    fields: ['toolNumber'],
    values: (step) => ({ toolNumber: step.toolNumber }),
    step(id, values, before) {
      const old = before?.kind === 'START_TOOL' ? before : undefined
      return {
        id,
        kind: 'START_TOOL',
        resultName: old?.resultName ?? '',
        toolNumber: values.toolNumber.trim(),
        toolParameter: old ? [...old.toolParameter] : [],
      }
    },
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
