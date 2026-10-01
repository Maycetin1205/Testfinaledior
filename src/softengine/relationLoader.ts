import type { RuntimeLoadRelation } from '../core/data/deliveries/relationRows'
import {
  positionParams,
  type PositionFetch,
  type RelationAnswer,
  type RuntimeRelation,
} from '../core/data/relations'
import { reportTrigger, seWindow } from './bridge'
import { fieldRead } from './data'
import { fetchedRowsFor, setFetchedRows } from './fetchedRows'
import { relationFromList, relationRun } from './relations'

const MAX_POSITIONS = 999

const CUT_POS = '0'

interface GetSource {
  id: string
  name: string
}

const generations = new Map<string, number>()

function emptySource(name: string): void {
  const before = fetchedRowsFor(name)
  setFetchedRows(name, [])
  if (before !== undefined && before.length > 0) reportTrigger()
}

async function question(
  template: RuntimeRelation,
  positions: PositionFetch,
  key: { documentKind: string; documentNumber: string; year: string; archive: string },
  position: number,
  pos: string,
  len: string,
): Promise<RelationAnswer> {
  return relationRun(
    template,
    positionParams(positions.slots, { ...key, positionNumber: position, pos, len }),
    { recordAnswer: true },
  )
}

export function loadRowsPerRelation(
  source: GetSource,
  load: RuntimeLoadRelation,
  giverRow: unknown,
): void {
  const gen = (generations.get(source.id) ?? 0) + 1
  generations.set(source.id, gen)

  if (giverRow === undefined) {
    emptySource(source.name)
    return
  }

  const key = {
    documentKind: fieldRead(giverRow, load.documentKindField),
    documentNumber: fieldRead(giverRow, load.documentNumberField),

    // Without a field the current year (0) and not archived (N), as the
    // document key 0NL… and the user's PUT 82 have them (user, 2026-10-01).
    year: load.yearField === '' ? '0' : fieldRead(giverRow, load.yearField),
    archive: load.archiveField === '' ? 'N' : fieldRead(giverRow, load.archiveField),
  }

  const template = relationFromList(seWindow().FF_RELATIONS, load.relationId)
  const positions = template?.positions
  if (key.documentKind === '' || key.documentNumber === '' || !template || !positions) {
    emptySource(source.name)
    return
  }

  emptySource(source.name)

  void (async () => {
    const rows: Record<string, string>[] = []

    for (let position = 1; position <= MAX_POSITIONS; position += 1) {
      const answer = await question(template, positions, key, position, CUT_POS, String(positions.answerLength))
      if (generations.get(source.id) !== gen) return

      if (answer.failed === true) return
      const record = answer.value

      if (load.endFields.every((field) => fieldRead({ SATZ: record }, field) === '')) break

      const row: Record<string, string> = { SATZ: record }
      for (const field of load.extraFields) {
        const divider = field.indexOf('_')
        const extra = await question(
          template,
          positions,
          key,
          position,
          field.slice(0, divider),
          field.slice(divider + 1),
        )
        if (generations.get(source.id) !== gen) return
        if (extra.failed === true) return
        row[field] = extra.value
      }
      rows.push(row)
    }

    if (generations.get(source.id) === gen) {
      setFetchedRows(source.name, rows)
      reportTrigger()
    }
  })()
}
