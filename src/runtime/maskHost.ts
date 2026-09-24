import type { RuntimeQuery, RuntimeSource } from '../core/data/dataSources'
import type { RuntimeLoadRelation } from '../core/data/fetchRelation'
import type { RuntimeGetValue } from '../core/data/getValue'
import type { StepHost } from '../core/data/steps/stepAdapter'

// Everything a mask asks of the world outside it. softEngineHost answers in the
// mask, previewHost in the editor, where the same blocks have nothing to show.
export interface MaskHost extends StepHost {
  start(): void
  hasData(): boolean
  // Delivery is true when the host brought new data, false when it only asks
  // the mask to show again what it has.
  onData(listener: (delivery: boolean) => void): () => void

  sources(): RuntimeSource[]
  source(id: string): RuntimeSource | undefined
  rows(source: RuntimeSource): unknown[]
  readField(row: unknown, code: string): string
  writeField(row: unknown, code: string, value: string): boolean

  // After a write: the host delivers the data again.
  requestFreshData(): void

  // Sources the mask fetches itself once it is open.
  loadRowsPerRelation(source: RuntimeSource, load: RuntimeLoadRelation, giverRow: unknown): void
  fetchValueSource(source: RuntimeSource, get: RuntimeGetValue): void
  fetchQuerySource(source: RuntimeSource, query: RuntimeQuery): void
}
