import type { ListBinding } from './listBinding'
import { propertyVisible, type Condition, type PropertyValue } from './property'

export interface BindableSpot {
  prop: string
  name: string
  when?: Condition
  previewProp?: string
}

export interface ValueSpot {
  prop: string
  name: string
}

export interface EventDef {
  key: string
  name: string
}

export interface LookupWindow {
  entriesProp?: string
  columnsKey: string
  widthKey: string
  heightKey: string

  sourceProp?: string
  sourceKey?: string
  storageFieldProp?: string
  storageTitleProp?: string
  titleKey?: string

  spot?: string
  when?: Condition
}

export type Capability =

  | { kind: 'source'; when?: Condition }

  | { kind: 'recordPick'; sourceProp?: string; when?: Condition }

  | { kind: 'followsSelection' }

  | { kind: 'bindable'; spots: readonly BindableSpot[] }

  | { kind: 'actionValue'; spots: readonly ValueSpot[] }

  | { kind: 'list'; binding: ListBinding }
  | { kind: 'lookupWindow'; window: LookupWindow }

  | { kind: 'capture'; when?: Condition }
  | { kind: 'delete'; when?: Condition }

  | { kind: 'change'; key: string }

  | { kind: 'holdsSent' }

  | { kind: 'compute'; prop: string }
  | { kind: 'events'; list: readonly EventDef[] }

export type CapabilityKind = Capability['kind']

export type CapabilityOf<A extends CapabilityKind> = Extract<Capability, { kind: A }>

export interface HasCapabilities {
  capabilities: readonly Capability[]
}

export function capability<A extends CapabilityKind>(
  carrier: HasCapabilities | undefined,
  kind: A,
): CapabilityOf<A> | undefined {
  return carrier?.capabilities.find((f): f is CapabilityOf<A> => f.kind === kind)
}

export function hasCapability(carrier: HasCapabilities | undefined, kind: CapabilityKind): boolean {
  return capability(carrier, kind) !== undefined
}

export function applies(
  f: { when?: Condition } | undefined,
  values: Readonly<Record<string, PropertyValue>>,
): boolean {
  return f !== undefined && propertyVisible(f.when, values)
}

export type BindingProp<P extends string = string> = `${P}Field`

export type BindingAttr = `${string}field`

export function bindingProp<P extends string>(prop: P): BindingProp<P> {
  return `${prop}Field`
}

export function bindingAttr(prop: string): BindingAttr {
  return `${prop.toLowerCase()}field`
}

export type BindableSpotProp<Props> = keyof Props extends infer K
  ? K extends BindingProp<infer P> ? P : never
  : never

export type BindableSpotsFor<Props> = ReadonlyArray<
  Omit<BindableSpot, 'prop' | 'previewProp'> & {
    prop: BindableSpotProp<Props>
    previewProp?: keyof Props & string
  }
>

export type ValueSpotsFor<Props> = ReadonlyArray<{
  prop: keyof Props & string
  name: string
}>

export function bindable<Props>(spots: BindableSpotsFor<Props>): CapabilityOf<'bindable'> {
  return { kind: 'bindable', spots }
}

export function actionValue<Props>(spots: ValueSpotsFor<Props>): CapabilityOf<'actionValue'> {
  return { kind: 'actionValue', spots }
}

export type PendingKind = 'captured' | 'changed' | 'deleted'

export interface CaptureCarrierElement {
  capturedRows: readonly (readonly string[])[]
  capturedKey: readonly string[]
}

export interface DeleteCarrierElement {
  deletedRows: readonly { record: string; values: readonly string[] }[]
}

export interface ChangeCarrierElement {
  changedRows: readonly { record: string; values: readonly string[] }[]
}

export interface Delivery {
  rows: readonly unknown[]
  recordOf: (row: unknown) => string
  read: (row: unknown, field: string) => string
}

export interface SentRowsElement {
  checkArrival: (delivery: Delivery | null) => void
}

export interface WrittenRow {
  key: string
  record: string
}

export interface RunReportElement {
  rowWrites: (kind: PendingKind, key: string) => void
  rowFailed: (kind: PendingKind, key: string) => void
  runDone: (kind: PendingKind, written: readonly WrittenRow[]) => void
}

export interface RuntimeContracts {
  capture: CaptureCarrierElement & RunReportElement
  change: ChangeCarrierElement & RunReportElement
  delete: DeleteCarrierElement & RunReportElement
  holdsSent: SentRowsElement
}

const CONTRACT_MEMBERS: { [A in keyof RuntimeContracts]: readonly string[] } = {
  capture: ['capturedRows', 'capturedKey', 'rowWrites', 'rowFailed', 'runDone'],
  change: ['changedRows', 'rowWrites', 'rowFailed', 'runDone'],
  delete: ['deletedRows', 'rowWrites', 'rowFailed', 'runDone'],
  holdsSent: ['checkArrival'],
}

export function contractOf<A extends keyof RuntimeContracts>(
  el: Element,
  kind: A,
): RuntimeContracts[A] {
  for (const member of CONTRACT_MEMBERS[kind]) {
    if (!(member in el)) {
      throw new Error(
        `<${el.tagName.toLowerCase()}> meldet die Faehigkeit „${kind}", hat aber „${member}" nicht.`,
      )
    }
  }
  return el as unknown as RuntimeContracts[A]
}
