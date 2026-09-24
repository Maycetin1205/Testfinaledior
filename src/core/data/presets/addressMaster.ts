import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const addressMaster: SourcePreset<'addressMaster'> = {
  id: 'addressMaster',
  name: 'Adressstamm',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'ADR',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  openRecord: { order: { kind: 'var' }, delivery: { kind: 'push', path: 'Var' } },
  fetches: false,
  writes: true,
}
