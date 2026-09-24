import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const document: SourcePreset<'document'> = {
  id: 'document',
  name: 'Beleg',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'BEL',
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
