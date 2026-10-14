import type { StepAdapter } from './stepAdapter'
import { relation, type RelationStep, type RuntimeRelationStep } from './relation'
import { popupOpen, type PopupOpenStep, type RuntimePopupOpenStep } from './popupOpen'
import { popupClose, type PopupCloseStep, type RuntimePopupCloseStep } from './popupClose'

export type Step = RelationStep | PopupOpenStep | PopupCloseStep

export type RuntimeStep =
  | RuntimeRelationStep
  | RuntimePopupOpenStep
  | RuntimePopupCloseStep

export type StepKind = Step['kind']

export type ActionChains = Record<string, Step[]>

const STEP_ADAPTERS: { [K in StepKind]: StepAdapter<K> } = {
  RELATION: relation,
  POPUP_OPEN: popupOpen,
  POPUP_CLOSE: popupClose,
}

const STEP_KINDS: readonly StepKind[] = Object.values(STEP_ADAPTERS).map((a) => a.kind)

export function stepAdapter(kind: StepKind): StepAdapter<StepKind> {
  return STEP_ADAPTERS[kind]
}

export function isStepKind(kind: string): kind is StepKind {
  return (STEP_KINDS as readonly string[]).includes(kind)
}
