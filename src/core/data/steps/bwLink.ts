import { placeholderInsert } from '../relations'
import type { StepAdapter, StepBase } from './stepAdapter'

export interface BwLinkStep extends StepBase {
  kind: 'BW_LINK'

  command: string
}

export type RuntimeBwLinkStep = Omit<BwLinkStep, 'id'>

export const bwLink: StepAdapter<'BW_LINK'> = {
  kind: 'BW_LINK',
  name: 'BW-Befehl',
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
  check(step) {
    return step.command.trim() === '' ? 'Schritt "BW-Befehl" hat keinen Befehl.' : null
  },
  run(step, run) {
    const command = placeholderInsert({ parameter: [step.command] }, run.values)[0] ?? ''
    return Promise.resolve({ failed: !run.host.sendBwLink(command) })
  },
  summary(step) {
    return {
      what: 'BW-Befehl',
      detail: step.command.trim() !== '' ? ` — ${step.command}` : '',
      target: '',
      origin: '',
      table: '',
    }
  },
  form: {
    fields: ['command'],
    values: (step) => ({ command: step.command }),
    step(id, values, before) {
      return {
        id,
        kind: 'BW_LINK',
        resultName: before?.kind === 'BW_LINK' ? before.resultName : '',
        command: values.command.trim(),
      }
    },
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
