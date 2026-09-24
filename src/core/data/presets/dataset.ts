import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const dataset: SourcePreset<'dataset'> = {
  id: 'dataset',
  name: 'DataSet',
  keyLabel: 'DataSet-ID',
  columnsLabel: 'Spalte im DataSet',
  tableId: '',
  key: (raw) => keyFromInput(raw, false),
  prefixed: false,
  list: () => ({ order: { kind: 'dataset' }, delivery: { kind: 'push', path: 'Tabellen' } }),
  fetches: false,
  writes: false,
}
