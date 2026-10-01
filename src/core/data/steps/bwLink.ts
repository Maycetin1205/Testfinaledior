import { placeholderInsert } from '../relations'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface BwLinkStep extends StepBase {
  kind: 'BW_LINK'

  command: string
}

export type RuntimeBwLinkStep = Omit<BwLinkStep, 'id'>

export const bwLink: StepAdapter<'BW_LINK'> = {
  kind: 'BW_LINK',
  answers: false,
  read(raw, base) {
    if (typeof raw.command !== 'string') return null
    return { id: base.id, kind: 'BW_LINK', resultName: base.resultName, command: raw.command }
  },
  readExported(raw, resultName) {
    if (typeof raw.command !== 'string') return null
    return { kind: 'BW_LINK', resultName, command: raw.command }
  },
  export(step) {
    return { kind: step.kind, resultName: step.resultName, command: step.command }
  },
  run(step, run) {
    const command = placeholderInsert({ parameter: [step.command] }, run.values)[0] ?? ''
    return Promise.resolve({ failed: !run.host.sendBwLink(command) })
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
