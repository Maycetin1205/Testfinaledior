import {
  RELATION_VERBS,
  checkPositionFetch,
  type RelationVerb,
  type RuntimeRelation,
} from '../core/data/relations'
import { seWindow } from './bridge'
import { isObject } from './data'

// The relations of the mask at run time: the catalog the export laid into
// the page, and the three jobs around a relation in their own files. Reading
// an answer: relations/answer.ts. Sending and waiting: relations/hostQueue.ts.
// The values of the places: relations/parameters.ts.

export { fieldFromAnswer } from './relations/answer'
export { queryRun, relationRun } from './relations/hostQueue'
export { parameterResolve } from './relations/parameters'

export function runtimeRelation(id: string): RuntimeRelation | undefined {
  return relationFromList(seWindow().FF_RELATIONS, id)
}

export function relationFromList(list: unknown, id: string): RuntimeRelation | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!isObject(entry) || entry.id !== id) continue
    if (typeof entry.verb !== 'string' || !RELATION_VERBS.includes(entry.verb as RelationVerb)) continue
    if (typeof entry.nr !== 'string' || entry.nr === '') continue
    if (!Array.isArray(entry.parameter) || entry.parameter.some((p) => typeof p !== 'string')) continue
    const positions = entry.verb === 'GET_RELATION' ? checkPositionFetch(entry.positions, entry.parameter.length) : null
    return {
      id,
      verb: entry.verb as RelationVerb,
      nr: entry.nr,
      parameter: entry.parameter as string[],
      ...(positions ? { positions } : {}),
    }
  }
  return undefined
}
