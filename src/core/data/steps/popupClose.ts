import type { StepAdapter, StepBase } from './stepAdapter'
import {
  applyPopupStep,
  popupIdMoved,
  popupIdRead,
  popupNameRead,
  popupProblem,
  popupSummary,
} from './popupStep'

export interface PopupCloseStep extends StepBase {
  kind: 'POPUP_CLOSE'
  popupId: string
}

export interface RuntimePopupCloseStep {
  kind: 'POPUP_CLOSE'
  resultName: string
  popup: string
}

export const popupClose: StepAdapter<'POPUP_CLOSE'> = {
  kind: 'POPUP_CLOSE',
  name: 'Popup schließen',
  answers: false,
  read(raw, base) {
    const popupId = popupIdRead(raw)
    return popupId === null ? null : { id: base.id, kind: 'POPUP_CLOSE', resultName: base.resultName, popupId }
  },
  readExported(raw, resultName) {
    const popup = popupNameRead(raw)
    return popup === null ? null : { kind: 'POPUP_CLOSE', resultName, popup }
  },
  export(step, refs) {
    return { kind: step.kind, resultName: step.resultName, popup: refs.popupName(step.popupId) }
  },
  check: (step, world) => popupProblem(step.popupId, world),
  run(step, run) {
    applyPopupStep(run.root, step.popup, false)
    return Promise.resolve({ failed: false })
  },
  summary: (step, world) => popupSummary('Popup schließen', world.popupName(step.popupId)),
  form: {
    fields: ['popup'],
    values: (step) => ({ popupId: step.popupId }),
    step(id, values, before) {
      return {
        id,
        kind: 'POPUP_CLOSE',
        resultName: before?.kind === 'POPUP_CLOSE' ? before.resultName : '',
        popupId: values.popupId,
      }
    },
  },
  bindings: () => [],
  withBindings: (step) => step,
  withBlockIds(step, newId) {
    const popupId = popupIdMoved(step.popupId, newId)
    return popupId === undefined ? step : { ...step, popupId }
  },
  relationId: () => '',
}
