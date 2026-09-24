import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const idb: SourcePreset<'idb'> = {
  id: 'idb',
  name: 'IDB-Tabelle',
  keyLabel: 'Kennung',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: true, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  fetches: false,
  writes: true,
}
