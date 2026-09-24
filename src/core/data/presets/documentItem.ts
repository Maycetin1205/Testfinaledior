import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const documentItem: SourcePreset<'documentItem'> = {
  id: 'documentItem',
  name: 'Belegpositionen',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'POS',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: (choice) => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: true, headerKey: choice.headerKey },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  openRecord: { order: { kind: 'var' }, delivery: { kind: 'push', path: 'Var' } },
  fetches: true,
  writes: true,
}
