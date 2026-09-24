import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import type { RelationTemplate } from '../../core/data/relations'
import type { StepFormValues } from '../../core/data/steps/stepAdapter'
import { STEP_KINDS, stepAdapter, type Step, type StepKind } from '../../core/data/steps/steps'
import type { FieldAdoptTarget } from './fieldAdopt'

export interface StepDraft extends StepFormValues {
  id: string

  type: StepKind

  search: string

  showError: boolean

  pickerTarget: FieldAdoptTarget | null
}

const EMPTY_VALUES: StepFormValues = {
  toolNumber: '',
  command: '',
  popupId: '',
  relationId: '',
  relationParams: [],
  extraParams: [],
}

export function templateOf(
  relation: readonly RelationTemplate[],
  id: string | undefined,
): RelationTemplate | undefined {
  return id === undefined || id === '' ? undefined : relation.find((r) => r.id === id)
}

export function draftFrom(
  step: Step | undefined,
  relations: readonly RelationTemplate[],
): StepDraft {
  return {
    ...EMPTY_VALUES,
    ...(step ? stepAdapter(step.kind).form.values(step, relations) : {}),
    id: step?.id ?? crypto.randomUUID(),
    type: step?.kind ?? STEP_KINDS[0],
    search: '',
    showError: false,
    pickerTarget: null,
  }
}

function onLength(
  current: readonly Parameter[],
  relation: RelationTemplate | undefined,
): Parameter[] {
  if (!relation) return [...current]
  const next = relationParameterDefault(relation)
  current.forEach((binding, at) => { if (at < next.length) next[at] = binding })
  return next
}

export type StepAction =
  | { kind: 'type'; type: StepKind }
  | { kind: 'toolNumber'; value: string }
  | { kind: 'command'; value: string }
  | { kind: 'popup'; id: string }
  | { kind: 'search'; value: string }
  | { kind: 'relation'; id: string; chosen: RelationTemplate | undefined }
  | { kind: 'binding'; index: number; binding: Parameter }
  | { kind: 'bringBack' }
  | { kind: 'extraAdd' }
  | { kind: 'extraChange'; index: number; binding: Parameter }
  | { kind: 'extraRemove'; index: number }
  | { kind: 'picker'; target: FieldAdoptTarget | null }
  | { kind: 'adopt'; params: Parameter[] }
  | { kind: 'showError' }

export function stepReducer(relations: readonly RelationTemplate[]) {
  return (draft: StepDraft, action: StepAction): StepDraft => {
    const relation = templateOf(relations, draft.relationId)
    switch (action.kind) {
      case 'type':
        return { ...draft, type: action.type, pickerTarget: null }
      case 'toolNumber':
        return { ...draft, toolNumber: action.value }
      case 'command':
        return { ...draft, command: action.value }
      case 'popup':
        return { ...draft, popupId: action.id }
      case 'search':
        return { ...draft, search: action.value }
      case 'relation': {
        const chosen = action.chosen
        const body = {
          ...draft,
          relationId: action.id,
          pickerTarget: null,
        }
        if (!chosen) return body
        return {
          ...body,
          relationParams: relationParameterDefault(chosen),
          extraParams: chosen.extraParameterAllowed ? body.extraParams : [],
        }
      }
      case 'binding': {
        const params = onLength(draft.relationParams, relation)
        params[action.index] = action.binding
        return { ...draft, relationParams: params }
      }
      case 'bringBack': {
        const defaults = relation ? relationParameterDefault(relation) : []
        return {
          ...draft,
          relationParams: draft.relationParams.map((binding, index) =>
            binding.source === 'omitted'
              ? defaults[index] ?? { source: 'fixed', value: '' }
              : binding),
        }
      }
      case 'extraAdd':
        return { ...draft, extraParams: [...draft.extraParams, { source: 'fixed', value: '' }] }
      case 'extraChange':
        return {
          ...draft,
          extraParams: draft.extraParams.map((b, at) => (at === action.index ? action.binding : b)),
        }
      case 'extraRemove':
        return {
          ...draft,
          extraParams: draft.extraParams.filter((_, at) => at !== action.index),
        }
      case 'picker':
        return { ...draft, pickerTarget: action.target }
      case 'adopt':
        return {
          ...draft,
          relationParams: action.params,
          pickerTarget: null,
        }
      case 'showError':
        return { ...draft, showError: true }
    }
  }
}

export function candidateFrom(
  draft: StepDraft,
  relation: RelationTemplate | undefined,
  before: Step | undefined,
): Step {
  return stepAdapter(draft.type).form.step(draft.id, draft, before, relation)
}
