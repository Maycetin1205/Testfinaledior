import type { RuntimeQuery } from '../core/data/deliveries/message'
import { reportTrigger } from './bridge'
import { fieldRead } from './data'
import { setFetchedRows } from './fetchedRows'
import { queryRun } from './relations'
import { rowsOfSource, runtimeSource } from './runtimeSources'

interface QuerySource {
  id: string
  name: string
}

// Per source, the address its rows were fetched for: another document with
// another address fetches them again.
const queries = {
  fetched: new Map<string, string>(),
  inFlight: new Set<string>(),
}

// The address the query asks for: the field of the first row of its source.
function addressOf(query: RuntimeQuery): string {
  const address = query.restriction?.address
  if (!address) return ''
  const source = runtimeSource(address.sourceId)
  return source ? fieldRead(rowsOfSource(source)[0], address.code) : ''
}

export function fetchQuerySource(source: QuerySource, query: RuntimeQuery): void {
  const address = addressOf(query)
  // An address asked for that is not there yet: nothing is fetched until it comes.
  if (query.restriction?.address && address === '') return
  if (queries.fetched.get(source.id) === address || queries.inFlight.has(source.id)) return
  queries.inFlight.add(source.id)
  void (async () => {
    const answer = await queryRun(query, source.name, { documentKind: query.restriction?.documentKind ?? '', address })
    queries.inFlight.delete(source.id)

    if (answer.rows === undefined) return
    queries.fetched.set(source.id, address)
    setFetchedRows(source.name, answer.rows)
    reportTrigger()
  })()
}
