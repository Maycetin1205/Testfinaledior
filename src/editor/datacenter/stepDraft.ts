import {
  relationParameterDefault,
  type Parameter,
  type Step,
  type StepKind,
} from '../../core/data/actions'
import type { RelationTemplate } from '../../core/data/relations'
import type { FieldAdoptTarget } from './fieldAdopt'

export interface StepDraft {
  id: string

  type: StepKind
  toolNr: string
  command: string
  popupId: string
  relationId: string
  relationParams: Parameter[]
  extraParams: Parameter[]

  search: string

  showError: boolean

  pickerTarget: FieldAdoptTarget | null
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
  const relationStep = step?.kind === 'RELATION' ? step : undefined
  const relation = templateOf(relations, relationStep?.relationId)
  return {
    id: step?.id ?? crypto.randomUUID(),
    type: step?.kind ?? 'START_TOOL',
    toolNr: step?.kind === 'START_TOOL' ? step.toolNr : '',
    command: step?.kind === 'BW_LINK' ? step.command : '',
    popupId: step?.kind === 'POPUP_OPEN' || step?.kind === 'POPUP_CLOSE' ? step.popupId : '',
    relationId: relationStep?.relationId ?? '',
    relationParams: startParams(relationStep, relation),
    extraParams: relationStep ? relationStep.extraParameter.map((b) => ({ ...b })) : [],
    search: '',
    showError: false,
    pickerTarget: null,
  }
}

function startParams(
  step: { parameter: Parameter[] } | undefined,
  relation: RelationTemplate | undefined,
): Parameter[] {
  if (!step) return []

  if (relation && step.parameter.length !== relation.parameter.length) {
    return relationParameterDefault(relation)
  }
  return step.parameter.map((b) => ({ ...b }))
}

export function bindingFor(
  draft: StepDraft,
  defaults: readonly Parameter[],
  index: number,
): Parameter {
  return draft.relationParams[index] ?? defaults[index] ?? { source: 'fixed', value: '' }
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
  | { kind: 'toolNr'; value: string }
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
      case 'toolNr':
        return { ...draft, toolNr: action.value }
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
            binding.source === 'from'
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
  const { id, type } = draft

  if (type === 'POPUP_OPEN' || type === 'POPUP_CLOSE') {
    return {
      id,
      kind: type,
      resultName: before?.kind === type ? before.resultName : '',
      popupId: draft.popupId,
    }
  }
  if (type === 'BW_LINK') {
    return {
      id,
      kind: 'BW_LINK',
      resultName: before?.kind === 'BW_LINK' ? before.resultName : '',
      command: draft.command.trim(),
    }
  }
  if (type === 'START_TOOL') {
    const old = before?.kind === 'START_TOOL' ? before : undefined
    return {
      id,
      kind: 'START_TOOL',
      resultName: old?.resultName ?? '',
      toolNr: draft.toolNr.trim(),
      toolParameter: old ? [...old.toolParameter] : [],
    }
  }
  const defaults = relation ? relationParameterDefault(relation) : []
  return {
    id,
    kind: 'RELATION',
    relationId: draft.relationId,
    parameter: relation
      ? relation.parameter.map((_, index) => bindingFor(draft, defaults, index))
      : [],
    extraParameter: [...draft.extraParams],
    resultName: before?.resultName ?? '',
  }
}
