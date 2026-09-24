import type { PendingKind } from '../../block/capability'
import type { MaskTree } from '../../block/tree'
import type { DataSource } from '../dataSources'
import type { Parameter, RuntimeValues } from '../actions'
import type { RelationAnswer, RelationTemplate, RuntimeRelation } from '../relations'
import type { RuntimeStep, Step, StepKind } from './steps'

export interface StepBase {
  id: string
  kind: StepKind

  resultName: string

  note?: string
}

// An intersection instead of Extract keeps an adapter of one kind assignable to
// the adapter of all kinds.
export type StepOf<K extends StepKind> = Step & { kind: K }
export type RuntimeStepOf<K extends StepKind> = RuntimeStep & { kind: K }

// A missing list is not checked against.
export interface CheckWorld {
  relations?: readonly RelationTemplate[]
  dataSources?: readonly DataSource[]
  popupIds?: readonly string[]
  resultIds?: readonly string[]
  actionValues?: readonly { blockId: string; prop: string }[]
  selectionGiverIds?: readonly string[]
  before?: readonly Step[]
  section?: 'once' | PendingKind
}

export interface ExportRefs {
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

export interface StepRun {
  host: StepHost
  root: ParentNode
  values: Readonly<Record<string, string | undefined>>
  parameterValues: RuntimeValues
}

export interface StepOutcome {
  failed: boolean

  answer?: { value: string; raw: unknown; wrote: boolean }
}

export interface SummaryWorld {
  relations: readonly RelationTemplate[]
  tree: MaskTree
  sources: readonly DataSource[]
  popupName: (id: string) => string | undefined
  stepNumber: (id: string) => number
}

export interface StepSummary {
  what: string

  detail: string

  target: string

  origin: string

  table: string

  relation?: RelationTemplate
}

export type StepField = 'popup' | 'toolNumber' | 'command' | 'relation'

export interface StepFormValues {
  toolNumber: string
  command: string
  popupId: string
  relationId: string
  relationParams: Parameter[]
  extraParams: Parameter[]
}

// One kind of action step. Hooks are methods so that the register can hand out
// the adapter of any kind for a step of that kind.
export interface StepAdapter<K extends StepKind> {
  kind: K
  name: string
  // Waits for SoftEngine's answer, so the host has to listen before it runs.
  answers: boolean
  read(raw: Readonly<Record<string, unknown>>, base: { id: string; resultName: string }): StepOf<K> | null
  readExported(raw: Readonly<Record<string, unknown>>, resultName: string): RuntimeStepOf<K> | null
  export(step: StepOf<K>, refs: ExportRefs): RuntimeStepOf<K>
  check(step: StepOf<K>, world: CheckWorld): string | null
  run(step: RuntimeStepOf<K>, run: StepRun): Promise<StepOutcome>
  summary(step: StepOf<K>, world: SummaryWorld): StepSummary
  form: {
    fields: readonly StepField[]
    values(step: StepOf<K>, relations: readonly RelationTemplate[]): Partial<StepFormValues>
    // before is the step the form replaces, if any.
    step(
      id: string,
      values: StepFormValues,
      before: Step | undefined,
      relation: RelationTemplate | undefined,
    ): StepOf<K>
  }
  bindings(step: StepOf<K> | RuntimeStepOf<K>): readonly Parameter[]
  withBindings(step: StepOf<K>, map: (binding: Parameter) => Parameter): StepOf<K>
  withBlockIds(step: StepOf<K>, newId: (oldId: string) => string | undefined): StepOf<K>
  relationId(step: StepOf<K> | RuntimeStepOf<K>): string
}
