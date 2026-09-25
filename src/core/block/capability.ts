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

// One lookup window at the block, set up by these properties of the block.
export interface BlockLookupWindow {
  entriesProp?: undefined
  columnsKey: string
  widthKey: string
  heightKey: string

  sourceProp?: string
  storageFieldProp?: string
  storageTitleProp?: string

  spot?: string
  when?: Condition
}

// A lookup window per entry of this list; each entry keeps its own source
// field, columns and size.
export interface EntryLookupWindow {
  entriesProp: string

  spot?: string
  when?: Condition
}

export type LookupWindow = BlockLookupWindow | EntryLookupWindow

export type Capability =

  // helpersApart: the helper sources stand in a window of their own in the
  // bar, as the capture's do, whose columns look them up.
  | { kind: 'source'; when?: Condition; helpersApart?: boolean }

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

type CapabilityKind = Capability['kind']

type CapabilityOf<A extends CapabilityKind> = Extract<Capability, { kind: A }>

interface HasCapabilities {
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

type BindingAttr = `${string}field`

export function bindingProp<P extends string>(prop: P): BindingProp<P> {
  return `${prop}Field`
}

export function bindingAttr(prop: string): BindingAttr {
  return `${prop.toLowerCase()}field`
}

type BindableSpotProp<Props> = keyof Props extends infer K
  ? K extends BindingProp<infer P> ? P : never
  : never

type BindableSpotsFor<Props> = ReadonlyArray<
  Omit<BindableSpot, 'prop' | 'previewProp'> & {
    prop: BindableSpotProp<Props>
    previewProp?: keyof Props & string
  }
>

type ValueSpotsFor<Props> = ReadonlyArray<{
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

export interface CaptureCarrier {
  capturedRows: readonly (readonly string[])[]
  capturedKey: readonly string[]
}

export interface DeleteCarrier {
  deletedRows: readonly { record: string; values: readonly string[] }[]
}

export interface ChangeCarrier {
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
  capture: CaptureCarrier & RunReportElement
  change: ChangeCarrier & RunReportElement
  delete: DeleteCarrier & RunReportElement
  holdsSent: SentRowsElement
}

export type ContractKind = keyof RuntimeContracts

// The element class that fulfils a contract. A block names it when it declares
// the capability, and the type checker holds the class to the contract.
type ContractClass<A extends ContractKind> =
  abstract new (...args: never[]) => RuntimeContracts[A]

export type ContractClasses = { readonly [A in ContractKind]?: ContractClass<A> }
