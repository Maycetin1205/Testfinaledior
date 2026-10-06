import type { StepAdapter, StepBase } from './stepAdapter'

// The mask asks SoftEngine to close it, as SoftEngine's own masks do on
// Escape; nothing to choose.
export interface MaskCloseStep extends StepBase {
  kind: 'MASK_CLOSE'
}

export type RuntimeMaskCloseStep = Omit<MaskCloseStep, 'id'>

export const maskClose: StepAdapter<'MASK_CLOSE'> = {
  kind: 'MASK_CLOSE',
  answers: false,
  read(_raw, base) {
    return { id: base.id, kind: 'MASK_CLOSE', resultName: base.resultName }
  },
  readExported(_raw, resultName) {
    return { kind: 'MASK_CLOSE', resultName }
  },
  export(step) {
    return { kind: step.kind, resultName: step.resultName }
  },
  run(_step, run) {
    return Promise.resolve({ failed: !run.host.closeMask() })
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds: (step) => step,
  relationId: () => '',
}
