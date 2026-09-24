import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const file: SourcePreset<'file'> = {
  id: 'file',
  name: 'Andere Datei',
  keyLabel: 'Kennung',
  columnsLabel: '',
  tableId: '',
  key: (raw) => keyFromInput(raw, true),
  prefixed: false,
  list: (choice) => ({
    order: { kind: 'sefileloop', wildcard: false, underHeader: true, headerKey: choice.headerKey },
    delivery: { kind: 'push', path: 'SEFileLoop' },
  }),
  fetches: false,
  writes: true,
}
