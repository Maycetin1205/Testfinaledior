import { reportTrigger } from './bridge'
import type { RuntimeQuery } from './data'
import { setFetchedRows } from './fetchedRows'
import { queryRun } from './relations'

export interface QuerySource {
  id: string
  name: string
}

const fetched = new Set<string>()
const inFlight = new Set<string>()

export function holeQuerySource(source: QuerySource, query: RuntimeQuery): void {
  if (fetched.has(source.id) || inFlight.has(source.id)) return
  inFlight.add(source.id)
  void (async () => {
    const answer = await queryRun(query, source.name)
    inFlight.delete(source.id)

    if (answer.rows === undefined) return
    fetched.add(source.id)
    setFetchedRows(source.name, answer.rows)
    reportTrigger()
  })()
}
