import type { PendingKind } from '../../block/capability'
import { CELLS_PARAM_SOURCES } from '../actions'
import type { RelationTemplate } from '../relations'
import { isUnread } from '../../unread'
import type { CheckWorld } from './stepAdapter'
import { isStepKind, stepAdapter, type ActionChains, type RuntimeStep, type Step } from './steps'

export function chainsClean(
  raw: unknown,
  allowedEvents: readonly string[],
): ActionChains | undefined {
  if (!isUnread<ActionChains>(raw)) return undefined
  const out: ActionChains = {}
  for (const key of allowedEvents) {
    const chain = raw[key]
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: Step[] = []
    const seenIds = new Set<string>()
    let broken = false
    for (const entry of chain) {
      const id = isUnread<Step>(entry) && typeof entry.id === 'string' ? entry.id : ''
      const step = isUnread<Step>(entry) && typeof entry.kind === 'string' && isStepKind(entry.kind)
        && typeof entry.resultName === 'string'
        ? stepAdapter(entry.kind).read(entry, { id, resultName: entry.resultName })
        : null
      if (!step || id === '' || seenIds.has(id)) {
        broken = true
        break
      }
      seenIds.add(id)

      const note = isUnread<Step>(entry) && typeof entry.note === 'string' ? entry.note.trim() : ''
      steps.push(note !== '' ? { ...step, note } : step)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return Object.keys(out).length > 0 ? out : undefined
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
    const refs = { popupName, stepPosition: (id: string) => position.get(id) ?? '-1', columnsIndex }
    out[key] = steps.map((step) => stepAdapter(step.kind).export(step, refs))
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
  if (!isUnread<Record<string, RuntimeStep[]>>(parsed)) return {}
  const out: Record<string, RuntimeStep[]> = {}
  for (const [key, chain] of Object.entries(parsed)) {
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: RuntimeStep[] = []
    let broken = false
    for (const entry of chain) {
      const step = isUnread<RuntimeStep>(entry) && typeof entry.kind === 'string' && isStepKind(entry.kind)
        && typeof entry.resultName === 'string'
        ? stepAdapter(entry.kind).readExported(entry, entry.resultName)
        : null
      if (!step) {
        broken = true
        break
      }
      steps.push(step)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return out
}

interface RowsReference {
  kind: PendingKind

  blockId: string
}

function rowsReferenceOf(step: Step | RuntimeStep): RowsReference | null {
  let hit: RowsReference | null = null
  for (const binding of stepAdapter(step.kind).bindings(step)) {
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

export function sectionsOf(steps: readonly (Step | RuntimeStep)[]): Section[] {
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

export function stepsBefore(
  chain: readonly Step[],
  stepId: string | undefined,
): readonly Step[] {
  const own = stepId === undefined ? -1 : chain.findIndex((s) => s.id === stepId)
  return own < 0 ? chain : chain.slice(0, own)
}

export interface ResultStep {
  id: string
  nr: number
  name: string

  sourceId?: string
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
    const adapter = stepAdapter(s.kind)
    const relationId = adapter.relationId(s)
    if (relationId === '') continue
    const rel = relation?.find((r) => r.id === relationId)
    if (!rel || rel.verb !== 'GET_RELATION') continue
    const sourceId = adapter.bindings(s)
      .find((b) => b.source === 'dataField' && (b.sourceId ?? '') !== '')
      ?.sourceId
    out.push({
      id: s.id, nr: i + 1, name: rel.name,
      ...(sourceId === undefined ? {} : { sourceId }),
    })
  }
  return out
}

export function stepProblem(step: Step, world: Omit<CheckWorld, 'section'>): string | null {
  const section = world.before === undefined
    ? undefined
    : sectionsOf([...world.before, step]).at(-1)?.kind
  return stepAdapter(step.kind).check(step, section === undefined ? world : { ...world, section })
}

// The step whose result this one reads; the list sets it underneath.
export function anchorStepId(step: Step): string {
  for (const b of stepAdapter(step.kind).bindings(step)) {
    if (b.source === 'stepResult' && b.value !== '') return b.value
  }
  return ''
}
