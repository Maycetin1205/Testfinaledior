import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const erpMask: SourcePreset<'erpMask'> = {
  id: 'erpMask',
  name: 'ERP-Maske',
  keyLabel: 'Maskennummer',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, false),
  prefixed: true,
  list: (choice) => ({ order: { kind: 'mask', area: choice.area }, delivery: { kind: 'push', path: 'Masken' } }),
  fetches: false,
  writes: false,
}
