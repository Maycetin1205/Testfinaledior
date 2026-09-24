import { keyFromInput } from '../sourceInput'
import type { SourcePreset } from './sourcePreset'

export const relationValue: SourcePreset<'relationValue'> = {
  id: 'relationValue',
  name: 'Wert per Relation',
  keyLabel: '',
  columnsLabel: 'Name in der Antwort',
  tableId: '',
  key: (raw) => keyFromInput(raw, false),
  prefixed: false,
  list: (choice) => ({
    order: { kind: 'none' },
    delivery: { kind: 'relationValue', ...choice.getValue },
  }),
  fetches: false,
  writes: false,
}
