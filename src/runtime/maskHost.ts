import type { RuntimeSource } from '../core/data/dataSources'
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

  // A source the mask fetches itself; giverRow is the chosen row it follows.
  fetchRows(source: RuntimeSource, giverRow: unknown): void
}
