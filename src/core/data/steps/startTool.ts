import { placeholderInsert } from '../relations'
import type { Unread } from '../../unread'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface StartToolStep extends StepBase {
  kind: 'START_TOOL'
  toolNumber: string
  toolParameter: string[]
}

export type RuntimeStartToolStep = Omit<StartToolStep, 'id'>

function toolFields(raw: Unread<RuntimeStartToolStep>): { toolNumber: string; toolParameter: string[] } | null {
  if (typeof raw.toolNumber !== 'string' || !Array.isArray(raw.toolParameter)) return null
  const toolParameter = raw.toolParameter.filter((p): p is string => typeof p === 'string')
  if (toolParameter.length !== raw.toolParameter.length) return null
  return { toolNumber: raw.toolNumber, toolParameter }
}

export const startTool: StepAdapter<'START_TOOL'> = {
  kind: 'START_TOOL',
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
  run(step, run) {
    const sent = run.host.sendStartTool(
      step.toolNumber, placeholderInsert({ parameter: step.toolParameter }, run.values),
    )
    return Promise.resolve({ failed: !sent })
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
