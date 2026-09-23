import type { PendingKind } from '../block/capability'
import type { RelationTemplate } from './relations'

export type StepKind =
  | 'START_TOOL'
  | 'BW_LINK'
  | 'RELATION'
  | 'POPUP_OPEN'
  | 'POPUP_CLOSE'

export const STEP_KINDS: readonly StepKind[] = [
  'START_TOOL',
  'BW_LINK',
  'RELATION',

  'POPUP_OPEN',
  'POPUP_CLOSE',
]

export const BLOCK_ID_ATTR = 'data-ff-block-id'

export const PARAMETER_SOURCES = [
  'fixed',
  'context',
  'dataField',
  'blockValue',
  'chosenRow',

  'captureCell',

  'changeCell',

  'deleteCell',
  'previousResult',
  'stepResult',
  'seVariable',
] as const

const SAVED_PARAM_SOURCES = [...PARAMETER_SOURCES, 'omitted'] as const

export const CELLS_PARAM_SOURCES: Record<string, PendingKind> = {
  captureCell: 'captured',
  changeCell: 'changed',
  deleteCell: 'deleted',
}

export type ParameterSource = (typeof SAVED_PARAM_SOURCES)[number]

export interface Parameter {
  source: ParameterSource

  value: string

  sourceId?: string

  blockId?: string

  resultField?: string
}

export interface ResultStep {
  id: string
  nr: number
  name: string

  sourceId?: string
}

export function stepsBefore(
  chain: readonly Step[],
  stepId: string | undefined,
): readonly Step[] {
  const own = stepId === undefined ? -1 : chain.findIndex((s) => s.id === stepId)
  return own < 0 ? chain : chain.slice(0, own)
}

export function resultStepsBefore(
  chain: readonly Step[],
  stepId: string | undefined,
  relation: readonly RelationTemplate[] | undefined,
): ResultStep[] {
  const before = stepsBefore(chain, stepId)
  const out: ResultStep[] = []
  for (let i = 0; i < before.length; i++) {
    const s = before[i]
    if (s.kind !== 'RELATION') continue
    const rel = relation?.find((r) => r.id === s.relationId)
    if (!rel || rel.verb !== 'GET_RELATION') continue
    const sourceId = [...s.parameter, ...s.extraParameter]
      .find((b) => b.source === 'dataField' && (b.sourceId ?? '') !== '')
      ?.sourceId
    out.push({
      id: s.id, nr: i + 1, name: rel.name,
      ...(sourceId === undefined ? {} : { sourceId }),
    })
  }
  return out
}

interface ActionStepBase {
  id: string
  kind: StepKind

  resultName: string

  note?: string
}

export interface StartToolStep extends ActionStepBase {
  kind: 'START_TOOL'
  toolNumber: string
  toolParameter: string[]
}

export interface BwLinkStep extends ActionStepBase {
  kind: 'BW_LINK'

  command: string
}

export interface RelationStep extends ActionStepBase {
  kind: 'RELATION'

  relationId: string

  parameter: Parameter[]

  extraParameter: Parameter[]
}

export interface PopupOpenStep extends ActionStepBase {
  kind: 'POPUP_OPEN'
  popupId: string
}

export interface PopupCloseStep extends ActionStepBase {
  kind: 'POPUP_CLOSE'
  popupId: string
}

export type PopupStep = PopupOpenStep | PopupCloseStep

export type Step = StartToolStep | BwLinkStep | RelationStep | PopupStep
export type ActionChains = Record<string, Step[]>

export const RECORD_PLACEHOLDER = ['PINDEX', 'DROP_PINDEX'] as const

export const ACTION_PLACEHOLDER = [...RECORD_PLACEHOLDER, 'VALUE', 'NOW_DATE'] as const

export function relationParameterDefault(
  relation: Pick<RelationTemplate, 'parameter'>,
): Parameter[] {
  return relation.parameter.map((raw) => {
    const placeholder = /^\{([A-Za-z0-9_]+)\}$/.exec(raw)?.[1]
    return placeholder && (ACTION_PLACEHOLDER as readonly string[]).includes(placeholder)
      ? { source: 'context', value: placeholder }
      : { source: 'fixed', value: '' }
  })
}

interface RuntimePopupFields {
  resultName: string
  popupId?: string
  popup?: string
}

export type RuntimePopupStep =
  | (RuntimePopupFields & { kind: 'POPUP_OPEN' })
  | (RuntimePopupFields & { kind: 'POPUP_CLOSE' })

export type RuntimeStep =
  | Omit<StartToolStep, 'id'>
  | Omit<BwLinkStep, 'id'>
  | Omit<RelationStep, 'id'>
  | RuntimePopupStep

function isSeObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function checkParameterBinding(raw: unknown): Parameter | null {
  if (!isSeObject(raw)) return null
  if (
    typeof raw.source !== 'string'
    || !(SAVED_PARAM_SOURCES as readonly string[]).includes(raw.source)
    || typeof raw.value !== 'string'
  ) return null
  if (raw.sourceId !== undefined && typeof raw.sourceId !== 'string') return null
  if (raw.blockId !== undefined && typeof raw.blockId !== 'string') return null
  if (raw.resultField !== undefined && typeof raw.resultField !== 'string') return null
  return {
    source: raw.source as ParameterSource,
    value: raw.value,
    ...(typeof raw.sourceId === 'string' ? { sourceId: raw.sourceId } : {}),
    ...(typeof raw.blockId === 'string' ? { blockId: raw.blockId } : {}),

    ...(raw.source === 'stepResult' && typeof raw.resultField === 'string'
      ? { resultField: raw.resultField }
      : {}),
  }
}

function stepFields(raw: unknown): RuntimeStep | null {
  if (!isSeObject(raw) || typeof raw.kind !== 'string' || typeof raw.resultName !== 'string') {
    return null
  }
  if (raw.kind === 'START_TOOL') {
    if (typeof raw.toolNumber !== 'string') return null
    if (!Array.isArray(raw.toolParameter) || raw.toolParameter.some((p) => typeof p !== 'string')) return null
    return {
      kind: 'START_TOOL',
      resultName: raw.resultName,
      toolNumber: raw.toolNumber,
      toolParameter: [...raw.toolParameter] as string[],
    }
  }
  if (raw.kind === 'BW_LINK') {
    if (typeof raw.command !== 'string') return null
    return { kind: 'BW_LINK', resultName: raw.resultName, command: raw.command }
  }
  if (raw.kind === 'POPUP_OPEN' || raw.kind === 'POPUP_CLOSE') {
    const popupId = typeof raw.popupId === 'string' ? raw.popupId : undefined
    const popup = typeof raw.popup === 'string' ? raw.popup : undefined
    if (popupId === undefined && popup === undefined) return null
    return {
      kind: raw.kind,
      resultName: raw.resultName,
      ...(popupId !== undefined ? { popupId } : {}),
      ...(popup !== undefined ? { popup } : {}),
    }
  }
  if (raw.kind === 'RELATION') {
    if (typeof raw.relationId !== 'string') return null
    if (!Array.isArray(raw.extraParameter)) return null

    if (!Array.isArray(raw.parameter)) return null
    const params: Parameter[] = []
    for (const value of raw.parameter) {
      const binding = checkParameterBinding(value)
      if (!binding) return null
      params.push(binding)
    }

    const extraParams: Parameter[] = []
    for (const value of raw.extraParameter) {
      const binding = checkParameterBinding(value)
      if (!binding) return null
      extraParams.push(binding)
    }
    return {
      kind: 'RELATION',
      resultName: raw.resultName,
      relationId: raw.relationId,
      parameter: params,
      extraParameter: extraParams,
    }
  }
  return null
}

export function chainsClean(
  raw: unknown,
  allowedEvents: readonly string[],
): ActionChains | undefined {
  if (!isSeObject(raw)) return undefined
  const out: ActionChains = {}
  for (const key of allowedEvents) {
    const chain = raw[key]
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: Step[] = []
    const seenIds = new Set<string>()
    let broken = false
    for (const entry of chain) {
      const fields = stepFields(entry)
      const id = isSeObject(entry) && typeof entry.id === 'string' ? entry.id : ''
      if (!fields || id === '' || seenIds.has(id)) {
        broken = true
        break
      }
      seenIds.add(id)

      const note = isSeObject(entry) && typeof entry.note === 'string' ? entry.note.trim() : ''
      steps.push({ id, ...fields, ...(note !== '' ? { note } : {}) } as Step)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function withoutEditorId(
  step: Step,
  popupName: (id: string) => string,

  stepPosition: (id: string) => string,

  columnsIndex: (blockId: string, key: string) => string,
): RuntimeStep {
  const binding = (b: Parameter): Parameter => {
    if (b.source === 'stepResult') return { ...b, value: stepPosition(b.value) }

    if (CELLS_PARAM_SOURCES[b.source] !== undefined) {
      return { ...b, value: columnsIndex(b.blockId ?? '', b.value) }
    }
    return { ...b }
  }
  if (step.kind === 'START_TOOL') {
    return {
      kind: step.kind,
      resultName: step.resultName,
      toolNumber: step.toolNumber,
      toolParameter: [...step.toolParameter],
    }
  }
  if (step.kind === 'BW_LINK') {
    return { kind: step.kind, resultName: step.resultName, command: step.command }
  }
  if (step.kind === 'POPUP_OPEN' || step.kind === 'POPUP_CLOSE') {
    return {
      kind: step.kind,
      resultName: step.resultName,
      popup: popupName(step.popupId),
    }
  }
  return {
    kind: step.kind,
    resultName: step.resultName,
    relationId: step.relationId,
    parameter: step.parameter.map(binding),
    extraParameter: step.extraParameter.map(binding),
  }
}

export function chainsForExport(
  events: ActionChains | undefined,
  eventOrder: readonly string[],

  popupName: (id: string) => string = () => '',

  columnsIndex: (blockId: string, key: string) => string = (_, key) => key,
): string | null {
  if (!events) return null
  const out: Record<string, RuntimeStep[]> = {}
  for (const key of eventOrder) {
    const steps = events[key]
    if (!steps?.length) continue

    const position = new Map(steps.map((s, i) => [s.id, String(i)]))
    out[key] = steps.map((step) =>
      withoutEditorId(step, popupName, (id) => position.get(id) ?? '-1', columnsIndex))
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null
}

export function chainsRead(raw: string | null): Record<string, RuntimeStep[]> {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isSeObject(parsed)) return {}
  const out: Record<string, RuntimeStep[]> = {}
  for (const [key, chain] of Object.entries(parsed)) {
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: RuntimeStep[] = []
    let broken = false
    for (const entry of chain) {
      const fields = stepFields(entry)
      if (!fields) {
        broken = true
        break
      }
      steps.push(fields)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return out
}

type StepForm = Step | RuntimeStep

interface RowsReference {
  kind: PendingKind

  blockId: string
}

function rowsReferenceOf(step: StepForm): RowsReference | null {
  if (step.kind !== 'RELATION') return null
  let hit: RowsReference | null = null
  for (const binding of [...step.parameter, ...step.extraParameter]) {
    const kind = CELLS_PARAM_SOURCES[binding.source]
    const blockId = binding.blockId ?? ''
    if (kind === undefined || blockId === '') continue
    if (hit && (hit.kind !== kind || hit.blockId !== blockId)) {
      return { kind, blockId: '' }
    }
    hit = { kind, blockId }
  }
  return hit
}

interface Section {
  kind: 'once' | PendingKind

  blockId: string

  slots: Set<number>
}

export function sectionsOf(steps: readonly StepForm[]): Section[] {
  const out: Section[] = []
  for (const [slot, step] of steps.entries()) {
    const reference = rowsReferenceOf(step)
    const last = out[out.length - 1]
    if (reference === null) {
      if (last) last.slots.add(slot)
      else out.push({ kind: 'once', blockId: '', slots: new Set([slot]) })
      continue
    }
    if (last && last.kind === reference.kind && last.blockId === reference.blockId) {
      last.slots.add(slot)
      continue
    }
    out.push({ kind: reference.kind, blockId: reference.blockId, slots: new Set([slot]) })
  }
  return out
}
