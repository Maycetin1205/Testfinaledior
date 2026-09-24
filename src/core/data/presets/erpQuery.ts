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
  list: () => ({ order: { kind: 'none' }, delivery: { kind: 'message' } }),
  fetches: false,
  writes: true,
}
