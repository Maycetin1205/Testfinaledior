import { SOURCES_DIVIDER, splitBinding } from '../block/blockType'
import { isSeObject } from './actions'
import { deliveryAdapter, isDeliveryKind, type Delivery, type RuntimeDelivery } from './deliveries/deliveries'
import { isOrderKind, orderAdapter, type Order } from './orders/orders'
import { isPresetId, sourcePreset, type PresetId } from './presets/presets'
import { EMPTY_CHOICE, type SourceChoice } from './presets/sourcePreset'
import { POS_LEN, keyDisplay } from './sourceInput'
import { isWriteKind, recordFieldOf, writeAdapter, type Write } from './writes/writes'

export {
  fieldPrefixFromInput,
  fieldCode,
  keyDisplay,
  keyFromInput,
  headerKeyFromInput,
  columnsNameFromInput,
} from './sourceInput'

export const LENGTH_MAX = 200

export interface DataField {
  code: string

  name: string

  length?: number
}

export interface DataSource {
  id: string

  name: string

  // The data center shows the form of this preset; the export never reads it.
  preset: PresetId

  // SoftEngine's id of what the source reads: table, query, DataSet or mask.
  tableId: string

  order: Order

  delivery: Delivery

  write: Write

  fieldPrefix?: string

  fields: readonly DataField[]
}

// A data source the way the exported mask hands it to its runtime.
export interface RuntimeSource {
  id: string
  name: string
  tableId: string
  recordField: string

  delivery: RuntimeDelivery
}

export function fieldPlainName(
  binding: string,
  ownSourceId: string,
  sources: readonly DataSource[],
): string {
  const { sourceId, code } = splitBinding(binding)
  const wanted = sourceId === '' ? ownSourceId : sourceId
  if (wanted === '' || code === '') return ''
  const source = sources.find((s) => s.id === wanted)
  return source?.fields.find((f) => f.code === code)?.name ?? ''
}

export function recordNumberOf(source: DataSource): string {
  return recordFieldOf(source.write)
}

export function sourcesKey(source: Pick<DataSource, 'tableId'>): string {
  return keyDisplay(source.tableId)
}

export function aliasOf(name: string): string {
  return name.trim().toLowerCase()
}

export function withUniqueNames(sources: readonly DataSource[]): DataSource[] {
  const taken = new Set<string>()
  return sources.map((s) => {
    let name = s.name
    for (let n = 2; taken.has(aliasOf(name)); n++) name = `${s.name.trim()} ${n}`
    taken.add(aliasOf(name))
    return name === s.name ? s : { ...s, name }
  })
}

// SoftEngine never sends a field its list leaves out. With wildcard it may be
// asked for '*', and must be as soon as one used code is no position and length.
export function orderedFields(
  source: DataSource,
  used: ReadonlySet<string> | undefined,
  getKey: readonly string[],
  wildcard: boolean,
): string {
  const withKeys = (codes: string[]): string[] => {
    for (const code of getKey) {
      if (!codes.includes(code)) codes.push(code)
    }
    return codes
  }

  const onlyUsed = (front: readonly string[], read: ReadonlySet<string>): string[] => {
    const codes = [...front]
    for (const f of source.fields) {
      if (read.has(f.code) && !codes.includes(f.code)) codes.push(f.code)
    }
    for (const code of read) {
      if (!codes.includes(code)) codes.push(code)
    }
    return withKeys(codes)
  }

  const index = recordNumberOf(source)
  const front = index === '' ? [] : [index]

  if (!wildcard) {
    if (!used || used.size === 0) {
      return withKeys(source.fields.map((f) => f.code)).join(',')
    }
    return onlyUsed(front, used).join(',')
  }

  if (!used || used.size === 0) return '*'

  const codes = onlyUsed(front, used)

  return codes.every((code) => POS_LEN.test(code)) ? codes.join(',') : '*'
}

export function allFieldsDelivered(source: DataSource): boolean {
  return orderAdapter(source.order.kind).allFields(source.order)
}

export function choiceOf(source: DataSource): SourceChoice {
  const { order, delivery, write } = source
  return {
    headerKey: order.kind === 'sefileloop' ? order.headerKey : '',
    area: order.kind === 'mask' ? order.area : '',
    openRecord: delivery.kind === 'push' && delivery.path === 'Var',
    load: delivery.kind === 'relationRows'
      ? {
          relationId: delivery.relationId,
          documentKindField: delivery.documentKindField,
          documentNumberField: delivery.documentNumberField,
          yearField: delivery.yearField,
          archiveField: delivery.archiveField,
          endFields: delivery.endFields,
        }
      : null,
    getValue: delivery.kind === 'relationValue'
      ? { relationId: delivery.relationId, parameter: delivery.parameter }
      : EMPTY_CHOICE.getValue,
    recordField: recordFieldOf(write),
  }
}

function orderRead(raw: unknown): Order | null {
  if (!isSeObject(raw) || typeof raw.kind !== 'string' || !isOrderKind(raw.kind)) return null
  return orderAdapter(raw.kind).read(raw)
}

function deliveryRead(raw: unknown): Delivery | null {
  if (!isSeObject(raw) || typeof raw.kind !== 'string' || !isDeliveryKind(raw.kind)) return null
  return deliveryAdapter(raw.kind).read(raw)
}

function writeRead(raw: unknown): Write | null {
  if (!isSeObject(raw) || typeof raw.kind !== 'string' || !isWriteKind(raw.kind)) return null
  return writeAdapter(raw.kind).read(raw)
}

function fieldsRead(raw: unknown): DataField[] {
  const fields: DataField[] = []
  for (const f of Array.isArray(raw) ? raw : []) {
    if (!isSeObject(f)) continue
    if (typeof f.code !== 'string' || f.code === '') continue
    if (f.code.includes(SOURCES_DIVIDER)) continue
    if (typeof f.name !== 'string' || f.name === '') continue

    const length = typeof f.length === 'number' && Number.isFinite(f.length)
      && f.length >= 1
      ? Math.min(LENGTH_MAX, Math.round(f.length))
      : undefined
    fields.push({
      code: f.code,
      name: f.name,
      ...(length === undefined ? {} : { length }),
    })
  }
  return fields
}

export function checkDataSources(raw: unknown): DataSource[] {
  if (!Array.isArray(raw)) return []
  const acc: DataSource[] = []
  const seen = new Set<string>()
  for (const e of raw) {
    if (!isSeObject(e)) continue
    if (typeof e.id !== 'string' || e.id === '') continue
    if (seen.has(e.id)) continue
    if (e.id.includes(SOURCES_DIVIDER)) continue
    if (typeof e.name !== 'string' || e.name.trim() === '') continue
    if (!isPresetId(e.preset)) continue
    const tableId = typeof e.tableId === 'string' ? e.tableId : ''

    // A part that no longer reads falls back to the list its preset offers.
    let order = orderRead(e.order)
    let delivery = deliveryRead(e.delivery)
    if (!order || !delivery) {
      const listed = sourcePreset(e.preset).list(EMPTY_CHOICE)
      order = orderRead(listed.order)
      delivery = deliveryRead(listed.delivery)
    }
    if (!order || !delivery) continue
    if ((orderAdapter(order.kind).needsTable || deliveryAdapter(delivery.kind).needsTable)
      && tableId.trim() === '') continue
    const write = writeRead(e.write) ?? { kind: 'none' }

    seen.add(e.id)
    acc.push({
      id: e.id,
      name: e.name,
      preset: e.preset,
      tableId,
      order,
      delivery,
      write,
      ...(typeof e.fieldPrefix === 'string' && e.fieldPrefix !== ''
        ? { fieldPrefix: e.fieldPrefix }
        : {}),
      fields: fieldsRead(e.fields),
    })
  }
  return acc
}
