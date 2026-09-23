import { reportTrigger } from './bridge'
import { fieldRead, type RuntimeLoadRelation } from './data'
import { fetchedRowsFor, setFetchedRows } from './fetchedRows'
import { relationRun, type RelationAnswer } from './relations'

const MAX_POSITIONEN = 999

const CUT_POS = '0'
const CUT_LEN = '255'

export interface GetSource {
  id: string
  name: string
}

const generationen = new Map<string, number>()

function emptySource(name: string): void {
  const before = fetchedRowsFor(name)
  setFetchedRows(name, [])
  if (before !== undefined && before.length > 0) reportTrigger()
}

async function question(
  load: RuntimeLoadRelation,
  key: { documentKind: string; documentNumber: string; year: string; archive: string },
  posNr: number,
  pos: string,
  len: string,
): Promise<RelationAnswer> {
  return relationRun(
    { id: 'relation-lader', verb: 'GET_RELATION', nr: load.nr, parameter: [] },
    [
      key.documentKind,
      pos,
      len,
      key.documentNumber,
      key.year,
      key.archive,
      '',
      String(posNr),
      '',
      '',
      '',
      '',
    ],
    { recordAnswer: true },
  )
}

export function loadRowsPerRelation(
  source: GetSource,
  load: RuntimeLoadRelation,
  geberRow: unknown,
): void {
  const gen = (generationen.get(source.id) ?? 0) + 1
  generationen.set(source.id, gen)

  if (geberRow === undefined) {
    emptySource(source.name)
    return
  }

  const key = {
    documentKind: fieldRead(geberRow, load.documentKindField),
    documentNumber: fieldRead(geberRow, load.documentNumberField),

    year: load.yearField === '' ? '' : fieldRead(geberRow, load.yearField),
    archive: load.archiveField === '' ? '' : fieldRead(geberRow, load.archiveField),
  }

  if (key.documentKind === '' || key.documentNumber === '') {
    emptySource(source.name)
    return
  }

  emptySource(source.name)

  void (async () => {
    const rows: Record<string, string>[] = []

    for (let posNr = 1; posNr <= MAX_POSITIONEN; posNr += 1) {
      const answer = await question(load, key, posNr, CUT_POS, CUT_LEN)
      if (generationen.get(source.id) !== gen) return

      if (answer.failed === true) return
      const record = answer.value

      if (load.endFields.every((field) => fieldRead({ SATZ: record }, field) === '')) break

      const row: Record<string, string> = { SATZ: record }
      for (const field of load.extraFields) {
        const divider = field.indexOf('_')
        const extra = await question(
          load,
          key,
          posNr,
          field.slice(0, divider),
          field.slice(divider + 1),
        )
        if (generationen.get(source.id) !== gen) return
        if (extra.failed === true) return
        row[field] = extra.value
      }
      rows.push(row)
    }

    if (generationen.get(source.id) === gen) {
      setFetchedRows(source.name, rows)
      reportTrigger()
    }
  })()
}
