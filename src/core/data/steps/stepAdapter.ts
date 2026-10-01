import type { Parameter, RuntimeValues } from '../actions'
import type { RelationAnswer, RuntimeRelation } from '../relations'
import type { RuntimeStep, Step, StepKind } from './steps'
import type { Unread } from '../../unread'

export interface StepBase {
  id: string
  kind: StepKind

  resultName: string

  note?: string
}

// An intersection instead of Extract keeps an adapter of one kind assignable to
// the adapter of all kinds.
type StepOf<K extends StepKind> = Step & { kind: K }
type RuntimeStepOf<K extends StepKind> = RuntimeStep & { kind: K }

interface ExportRefs {
  popupName: (id: string) => string
  stepPosition: (id: string) => string
  columnsIndex: (blockId: string, key: string) => string
}

// What a step may ask of the mask while it runs.
export interface StepHost {
  relation(id: string): RuntimeRelation | undefined
  resolveParameter(binding: Parameter, values: RuntimeValues): string
  runRelation(relation: RuntimeRelation, params: readonly string[]): Promise<RelationAnswer>
  sendStartTool(toolNumber: string, params: readonly string[]): boolean
  sendBwLink(command: string): boolean
}

interface StepRun {
  host: StepHost
  root: ParentNode
  values: Readonly<Record<string, string | undefined>>
  parameterValues: RuntimeValues
}

interface StepOutcome {
  failed: boolean

  answer?: { value: string; raw: unknown; wrote: boolean }
}

// One kind of action step. Hooks are methods so that the register can hand out
// the adapter of any kind for a step of that kind.
export interface StepAdapter<K extends StepKind> {
  kind: K
  // Waits for SoftEngine's answer, so the host has to listen before it runs.
  answers: boolean
  read(raw: Unread<StepOf<K>>, base: { id: string; resultName: string }): StepOf<K> | null
  readExported(raw: Unread<RuntimeStepOf<K>>, resultName: string): RuntimeStepOf<K> | null
  export(step: StepOf<K>, refs: ExportRefs): RuntimeStepOf<K>
  run(step: RuntimeStepOf<K>, run: StepRun): Promise<StepOutcome>
  bindings(step: StepOf<K> | RuntimeStepOf<K>): readonly Parameter[]
  withBindings(step: StepOf<K>, map: (binding: Parameter) => Parameter): StepOf<K>
  withBlockIds(step: StepOf<K>, newId: (oldId: string) => string | undefined): StepOf<K>
  relationId(step: StepOf<K> | RuntimeStepOf<K>): string
}
