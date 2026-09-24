import type { RuntimeGetValue } from '../core/data/deliveries/relationValue'
import { reportTrigger, seWindow } from './bridge'
import { setFetchedRows } from './fetchedRows'
import {
  relationRun,
  fieldFromAnswer,
  relationFromList,
  parameterResolve,
} from './relations'

interface ValueSource {
  id: string
  name: string
}

const generations = new Map<string, number>()

function rowFromAnswer(
  value: string,
  raw: unknown,
  fields: readonly string[],
): Record<string, string> {
  const row: Record<string, string> = {}
  fields.forEach((code, slot) => {
    const fromAnswer = fieldFromAnswer(raw, code)
    row[code] = fromAnswer !== '' ? fromAnswer : (slot === 0 ? value : '')
  })
  return row
}

export function fetchValueSource(source: ValueSource, get: RuntimeGetValue): void {
  const gen = (generations.get(source.id) ?? 0) + 1
  generations.set(source.id, gen)

  const relation = relationFromList(seWindow().FF_RELATIONS, get.relationId)

  if (!relation || relation.verb !== 'GET_RELATION') return

  const params = get.parameter.map((binding) =>
    parameterResolve(binding, { context: {}, previousResult: '' }))

  void (async () => {
    const answer = await relationRun(relation, params)
    if (generations.get(source.id) !== gen) return

    if (answer.failed === true) return
    setFetchedRows(source.name, [rowFromAnswer(answer.value, answer.raw, get.fields)])
    reportTrigger()
  })()
}
