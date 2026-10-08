import type { ListBinding } from './listBinding'
import { propertyVisible, type Condition, type PropertyValue } from './property'

export interface BindableSpot {
  prop: string
  name: string
  when?: Condition
  previewProp?: string

  // The spot takes several fields and shows their values in a row.
  several?: true
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

  // The property the window is titled by.
  titleProp?: string

  when?: Condition
}

// A lookup window per entry of this list; each entry keeps its own source
// field, columns and size.
export interface EntryLookupWindow {
  entriesProp: string

  // The fields the window's own columns show, read from the entry: the mask
  // orders them from the source of the entry's field choice.
  windowFields: (entry: unknown) => readonly string[]

  when?: Condition
}

export type LookupWindow = BlockLookupWindow | EntryLookupWindow

export type Capability =

  // The block reads one source and so holds its property. helpersApart: the
  // helper sources stand in a window of their own in the bar, as the
  // capture's do, whose columns look them up. after: the block's own property
  // the source follows in the export; without it the source comes first.
  | { kind: 'source'; when?: Condition; helpersApart?: boolean; after?: string }

  // The block gives the row clicked in it to the blocks that follow it; the
  // row comes from sourceProp while when holds, else from the block's source.
  // gives: the block gives a row only while this holds.
  | { kind: 'recordPick'; sourceProp?: string; when?: Condition; gives?: Condition }

  | { kind: 'followsSelection' }

  | { kind: 'bindable'; spots: readonly BindableSpot[] }

  | { kind: 'actionValue'; spots: readonly ValueSpot[] }

  | { kind: 'list'; binding: ListBinding }
  | { kind: 'lookupWindow'; window: LookupWindow }

  | { kind: 'capture'; when?: Condition }

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

type BindingProp<P extends string = string> = `${P}Field`

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

export type PendingKind = 'captured' | 'changed'

export interface CaptureCarrier {
  capturedRows: readonly (readonly string[])[]
  capturedKey: readonly string[]
}

export interface ChangeCarrier {
  changedRows: readonly { record: string; values: readonly string[] }[]
}

// The document delivered anew, or closed: what was written is through.
export interface SentRowsElement {
  writtenArrived: () => void
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

// A block whose values an action reads. A required value keeps the action from
// running while it is empty, and the cursor goes to it.
export interface ValueCarrier {
  valueRequired: (prop: string) => boolean
  focusValue: (prop: string) => void
}

export interface RuntimeContracts {
  actionValue: ValueCarrier
  capture: CaptureCarrier & RunReportElement
  change: ChangeCarrier & RunReportElement
  holdsSent: SentRowsElement
}

export type ContractKind = keyof RuntimeContracts

// The element class that fulfils a contract. A block names it when it declares
// the capability, and the type checker holds the class to the contract.
type ContractClass<A extends ContractKind> =
  abstract new (...args: never[]) => RuntimeContracts[A]

export type ContractClasses = { readonly [A in ContractKind]?: ContractClass<A> }
