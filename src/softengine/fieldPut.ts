import type { RuntimeSource } from '../core/data/dataSources'
import { fieldWriteParams } from '../core/data/relations'
import { relationRun, runtimeRelation } from './relations'

// One field of one record written back with the relation its source names for
// it. False when nothing went out: no such relation or one that writes no
// single field, no record, a code without position and length, or no host to
// send to.
export async function fieldPut(
  source: RuntimeSource,
  record: string,
  code: string,
  value: string,
): Promise<boolean> {
  const relation = runtimeRelation(source.writeRelation)
  if (!relation || record === '') return false
  const params = fieldWriteParams(relation, { code, tableId: source.tableId, record, value })
  if (!params) return false
  const answer = await relationRun(relation, params)
  return answer.failed !== true
}
