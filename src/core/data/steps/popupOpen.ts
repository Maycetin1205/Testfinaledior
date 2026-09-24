import type { StepAdapter, StepBase } from './stepAdapter'
import {
  applyPopupStep,
  popupIdMoved,
  popupIdRead,
  popupNameRead,
  popupProblem,
  popupSummary,
} from './popupStep'

export interface PopupOpenStep extends StepBase {
  kind: 'POPUP_OPEN'
  popupId: string
}

export interface RuntimePopupOpenStep {
  kind: 'POPUP_OPEN'
  resultName: string
  popup: string
}

export const popupOpen: StepAdapter<'POPUP_OPEN'> = {
  kind: 'POPUP_OPEN',
  name: 'Popup öffnen',
  answers: false,
  read(raw, base) {
    const popupId = popupIdRead(raw)
    return popupId === null ? null : { id: base.id, kind: 'POPUP_OPEN', resultName: base.resultName, popupId }
  },
  readExported(raw, resultName) {
    const popup = popupNameRead(raw)
    return popup === null ? null : { kind: 'POPUP_OPEN', resultName, popup }
  },
  export(step, refs) {
    return { kind: step.kind, resultName: step.resultName, popup: refs.popupName(step.popupId) }
  },
  check: (step, world) => popupProblem(step.popupId, world),
  run(step, run) {
    applyPopupStep(run.root, step.popup, true)
    return Promise.resolve({ failed: false })
  },
  summary: (step, world) => popupSummary('Popup öffnen', world.popupName(step.popupId)),
  form: {
    fields: ['popup'],
    values: (step) => ({ popupId: step.popupId }),
    step(id, values, before) {
      return {
        id,
        kind: 'POPUP_OPEN',
        resultName: before?.kind === 'POPUP_OPEN' ? before.resultName : '',
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
