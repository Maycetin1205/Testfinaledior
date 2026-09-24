import type { WriteAdapter } from './writeAdapter'

// A PUT relation per changed field, addressed by the record number of the row.
export interface PutRelationWrite {
  kind: 'putRelation'
  recordField: string
}

export const putRelation: WriteAdapter<'putRelation'> = {
  kind: 'putRelation',
  read(raw) {
    const recordField = typeof raw.recordField === 'string' ? raw.recordField.trim() : ''
    return recordField === '' ? null : { kind: 'putRelation', recordField }
  },
  recordField: (write) => write.recordField,
}
