import { restricts } from '../deliveries/message'
import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const erpQuery: SourcePreset<'erpQuery'> = {
  id: 'erpQuery',
  name: 'ERP-Abfrage',
  keyLabel: 'Kennung',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, true),
  prefixed: true,
  list: (choice) => ({
    order: { kind: 'none' },
    delivery: { kind: 'message', ...(restricts(choice.restriction) ? { restriction: choice.restriction } : {}) },
  }),
  fetches: false,
  writes: true,
}
