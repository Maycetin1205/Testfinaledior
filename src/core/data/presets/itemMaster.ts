import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const itemMaster: SourcePreset<'itemMaster'> = {
  id: 'itemMaster',
  name: 'Artikelstamm',
  keyLabel: '',
  columnsLabel: '',
  tableId: 'ART',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: () => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: false, headerKey: '' },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  fetches: false,
  writes: true,
}
