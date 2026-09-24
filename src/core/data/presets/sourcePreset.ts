import type { Order } from '../orders/orders'
import type { Delivery } from '../deliveries/deliveries'
import type { LoadRelation } from '../deliveries/relationRows'
import type { GetValue } from '../deliveries/relationValue'
import type { Write } from '../writes/writes'
import type { PresetId } from './presets'

// What the data center form holds about how a source is ordered and delivered.
export interface SourceChoice {
  headerKey: string
  area: string
  openRecord: boolean
  // The load relation, when the mask fetches the rows itself.
  load: LoadRelation | null
  getValue: GetValue
  recordField: string
}

export const EMPTY_CHOICE: SourceChoice = {
  headerKey: '',
  area: '',
  openRecord: false,
  load: null,
  getValue: { relationId: '', parameter: [] },
  recordField: '',
}

interface OrderAndDelivery {
  order: Order
  delivery: Delivery
}

interface SourceDescriptor extends OrderAndDelivery {
  write: Write
}

// A kind of source the data center offers. It fills in the descriptor; the
// export and the mask read only the descriptor.
export interface SourcePreset<P extends PresetId> {
  id: P
  name: string
  // The label of the table id input, '' when the preset fixes the table or needs none.
  keyLabel: string
  // The label of the column input, '' when fields are position and length.
  columnsLabel: string
  tableId: string
  key(raw: string): string
  // Field codes carry a prefix, like LFA_2_8.
  prefixed: boolean
  list(choice: SourceChoice): OrderAndDelivery
  openRecord?: OrderAndDelivery
  // The mask may fetch the rows itself with a load relation.
  fetches: boolean
  // Rows may carry a record number and be written back.
  writes: boolean
}

export function descriptorFor<P extends PresetId>(
  preset: SourcePreset<P>,
  choice: SourceChoice,
): SourceDescriptor {
  const recordField = choice.recordField.trim()
  const write: Write = preset.writes && recordField !== ''
    ? { kind: 'putRelation', recordField }
    : { kind: 'none' }
  if (preset.fetches && choice.load) {
    return { order: { kind: 'none' }, delivery: { kind: 'relationRows', ...choice.load }, write }
  }
  if (preset.openRecord && choice.openRecord) return { ...preset.openRecord, write }
  return { ...preset.list(choice), write }
}
