import type { RuntimeQuery } from '../core/data/deliveries/message'
import { reportTrigger } from './bridge'
import { setFetchedRows } from './fetchedRows'
import { queryRun } from './relations'

export interface QuerySource {
  id: string
  name: string
}

const queries = {
  fetched: new Set<string>(),
  inFlight: new Set<string>(),
}

export function fetchQuerySource(source: QuerySource, query: RuntimeQuery): void {
  if (queries.fetched.has(source.id) || queries.inFlight.has(source.id)) return
  queries.inFlight.add(source.id)
  void (async () => {
    const answer = await queryRun(query, source.name)
    queries.inFlight.delete(source.id)

    if (answer.rows === undefined) return
    queries.fetched.add(source.id)
    setFetchedRows(source.name, answer.rows)
    reportTrigger()
  })()
}
