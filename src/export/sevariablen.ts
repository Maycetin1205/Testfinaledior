import {
  sourceKind,
  areaOf,
  orderedFields,
  fetchesSelf,
  isOpenRecord,
  headerKeyOf,
  loopOrder,
  tableIdOf,
  varFromHeaderKeys,
  type DataSource,
} from '../core/data/dataSources'
import { escapeNonAsciiJs } from './serializer'

function varTogether(
  ...groups: { ID: string; FELDER: string }[][]
): { ID: string; FELDER: string }[] {
  const perId = new Map<string, string[]>()
  for (const entry of groups.flat()) {
    if (entry.ID === '') continue
    const codes = perId.get(entry.ID) ?? []
    for (const raw of entry.FELDER.split(',')) {
      const code = raw.trim()
      if (code !== '' && !codes.includes(code)) codes.push(code)
    }
    perId.set(entry.ID, codes)
  }
  return [...perId]
    .filter(([, codes]) => codes.length > 0)
    .map(([ID, codes]) => ({ ID, FELDER: codes.join(',') }))
}

export function buildSevariablen(
  used: readonly DataSource[],

  usedFields: ReadonlyMap<string, ReadonlySet<string>>,

  getKey: ReadonlyMap<string, string[]>,
): string {
  const orderable = used.filter((s) => !fetchesSelf(s))
  const perDataSet = orderable.filter((s) => sourceKind(s.kind).orderBlock === 'dataset')
  const perMask = orderable.filter((s) => sourceKind(s.kind).orderBlock === 'mask')

  const openRecords = orderable.filter(isOpenRecord)

  const ordered = loopOrder(
    orderable.filter(
      (s) => sourceKind(s.kind).orderBlock === 'sefileloop' && !isOpenRecord(s),
    ),
  )

  const dataset = perDataSet.map((s) => ({
    ID: tableIdOf(s),
    ALIAS: s.name,
    FELDER: orderedFields(s, usedFields.get(s.id), getKey.get(s.id) ?? []),
  }))

  const mask = perMask.map((s) => ({
    ID: tableIdOf(s),
    BEREICH: areaOf(s),
    FELDER: '*',
    REFRESH_FELDER: '*',
    ALIAS: s.name,
  }))
  const sefileloop = ordered.map((s) => {
    const headerKey = headerKeyOf(s)
    return {
      INDEX_NR: 0,
      ALIAS: s.name,
      ID: tableIdOf(s),
      ...(headerKey !== '' ? { KOPFSATZ_INDEX: headerKey } : {}),
      FELDER: orderedFields(s, usedFields.get(s.id), getKey.get(s.id) ?? []),
    }
  })

  const varSection = varTogether(
    varFromHeaderKeys(ordered),
    openRecords.map((s) => ({
      ID: tableIdOf(s),
      FELDER: orderedFields(s, usedFields.get(s.id), getKey.get(s.id) ?? []),
    })),
  )
  return escapeNonAsciiJs(
    JSON.stringify({
      ...(varSection.length > 0 ? { VAR: varSection } : {}),
      SEFILELOOP: sefileloop,

      ERPAPICALL: [],
      ...(dataset.length > 0 ? { DATASET: dataset } : {}),
      ...(mask.length > 0 ? { MASKE: mask } : {}),
    }, null, 2),
  ) + '\n'
}
