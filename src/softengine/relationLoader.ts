import { reportTrigger } from './bridge'
import { fieldRead, type RuntimeLoadRelation } from './data'
import { fetchedRowsFor, setFetchedRows } from './fetchedRows'
import { relationRun, type RelationAnswer } from './relations'
import { reportError } from './report'

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
    { silent: true, recordAnswer: true },
  )
}

function reportCancel(nr: string, posNr: number, base: string): void {
  reportError(
    `Positionen laden bei Zeile ${posNr} abgebrochen (Relation Nr. ${nr}): ${base} `
    + 'Es werden keine Positionen angezeigt — die Liste wäre unvollständig.',
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
    const missing = [
      key.documentKind === '' ? `Belegart (${load.documentKindField})` : '',
      key.documentNumber === '' ? `Belegnummer (${load.documentNumberField})` : '',
    ].filter((t) => t !== '').join(' und ')
    reportError(
      `Positionen laden: die angeklickte Zeile hat keine ${missing}. `
      + `Relation Nr. ${load.nr} kann so nicht gefragt werden — zeigt der `
      + 'angeklickte Baustein wirklich die Belegliste, die unter "Beleg kommt '
      + 'aus" steht?',
    )
    return
  }

  emptySource(source.name)

  void (async () => {
    const rows: Record<string, string>[] = []
    let endSeen = false

    for (let posNr = 1; posNr <= MAX_POSITIONEN; posNr += 1) {
      const answer = await question(load, key, posNr, CUT_POS, CUT_LEN)
      if (generationen.get(source.id) !== gen) return

      if (answer.error !== undefined) {
        reportCancel(load.nr, posNr, answer.error)
        return
      }
      const record = answer.value

      if (load.endFields.every((field) => fieldRead({ SATZ: record }, field) === '')) {
        endSeen = true
        break
      }

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
        if (extra.error !== undefined) {
          reportCancel(load.nr, posNr, extra.error)
          return
        }
        row[field] = extra.value
      }
      rows.push(row)
    }

    if (!endSeen) {
      reportError(
        `Positionen laden: nach ${MAX_POSITIONEN} Zeilen ohne Ende-Kennung abgebrochen `
        + `(Relation Nr. ${load.nr}) — die Liste ist wahrscheinlich unvollständig, `
        + 'vermutlich passen Relationsnummer oder Ende-Felder nicht.',
      )
    }

    if (generationen.get(source.id) === gen) {
      setFetchedRows(source.name, rows)
      reportTrigger()
    }
  })()
}
