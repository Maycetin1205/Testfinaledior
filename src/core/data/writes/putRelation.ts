import type { WriteAdapter } from './writeAdapter'

// A PUT relation per changed field, addressed by the record number of the row.
// The relation is the one the source names for writing a field; without it the
// record number only tells which record a row is.
export interface PutRelationWrite {
  kind: 'putRelation'
  recordField: string
  relationId?: string
}

export const putRelation: WriteAdapter<'putRelation'> = {
  kind: 'putRelation',
  read(raw) {
    const recordField = typeof raw.recordField === 'string' ? raw.recordField.trim() : ''
    if (recordField === '') return null
    const relationId = typeof raw.relationId === 'string' ? raw.relationId.trim() : ''
    return { kind: 'putRelation', recordField, ...(relationId !== '' ? { relationId } : {}) }
  },
  recordField: (write) => write.recordField,
  relationIds: (write) => (write.relationId ? [write.relationId] : []),
}
