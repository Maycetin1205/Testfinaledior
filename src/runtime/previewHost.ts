import type { RuntimeSource } from '../core/data/dataSources'
import type { MaskHost } from './maskHost'

// What the editor has instead of SoftEngine's data: its sources and a few
// sample rows for each, every row a record by field code.
export interface Samples {
  sources(): RuntimeSource[]
  rows(source: RuntimeSource): readonly Readonly<Record<string, string>>[]
}

// The host of the editor: no answers, nothing sent, no sign-in and no
// delivery, so no block hydrates as in the mask. A block on the canvas asks it
// for the sample rows of its source instead (readSamples, source.ts) and shows
// them where the mask shows its data; a field the samples lack keeps its
// placeholder.
export function previewHost(samples: Samples): MaskHost {
  return {
    start: () => {},
    hasData: () => false,
    onData: () => () => {},

    sources: () => samples.sources(),
    source: (id) => samples.sources().find((source) => source.id === id),
    rows: (source) => [...samples.rows(source)],
    readField: (row, code) => {
      if (typeof row !== 'object' || row === null) return ''
      const value: unknown = Reflect.get(row, code.trim())
      return typeof value === 'string' ? value : ''
    },
    writeField: () => false,

    relation: () => undefined,
    resolveParameter: () => '',
    runRelation: () => Promise.resolve({ value: '', raw: undefined, failed: true }),
    requestFreshData: () => {},

    fetchRows: () => {},
  }
}
