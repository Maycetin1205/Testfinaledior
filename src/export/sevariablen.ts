// Schreibt die SEvariablen: was die Maske bei SoftEngine bestellt.
import {
  artFuer,
  bestellteFelder,
  holtSelbst,
  istOffenerSatz,
  kopfsatzVon,
  loopReihenfolge,
  tabellenIdVon,
  varAusKopfsaetzen,
  type Datenquelle,
} from '../kern/daten/datenquellen'
import { escapeNonAsciiJs } from './serializer'

// Kopfsatz-Index und offener Satz koennen auf DIESELBE Tabelle zeigen. Zwei
// VAR-Eintraege mit derselben ID waeren eine doppelte Bestellung.
function varZusammen(
  ...gruppen: { ID: string; FELDER: string }[][]
): { ID: string; FELDER: string }[] {
  const proId = new Map<string, string[]>()
  for (const eintrag of gruppen.flat()) {
    if (eintrag.ID === '') continue
    const codes = proId.get(eintrag.ID) ?? []
    for (const roh of eintrag.FELDER.split(',')) {
      const code = roh.trim()
      if (code !== '' && !codes.includes(code)) codes.push(code)
    }
    proId.set(eintrag.ID, codes)
  }
  return [...proId]
    .filter(([, codes]) => codes.length > 0)
    .map(([ID, codes]) => ({ ID, FELDER: codes.join(',') }))
}

export function baueSevariablen(
  used: readonly Datenquelle[],

  benutzteFelder: ReadonlyMap<string, ReadonlySet<string>>,

  holSchluessel: ReadonlyMap<string, string[]>,
): string {
  const bestellbar = used.filter((s) => !holtSelbst(s))
  const perApi = bestellbar.filter((s) => artFuer(s.kind).bestellBlock === 'erpapicall')
  const perDataSet = bestellbar.filter((s) => artFuer(s.kind).bestellBlock === 'dataset')

  // Der offene Satz wird NICHT als Loop bestellt: SoftEngine liefert ihn im
  // VAR-Abschnitt (kontrakte.md 6). Ein Loop daneben waere eine zweite
  // Bestellung derselben Werte.
  const offeneSaetze = bestellbar.filter(istOffenerSatz)

  const geordnet = loopReihenfolge(
    bestellbar.filter(
      (s) => artFuer(s.kind).bestellBlock === 'sefileloop' && !istOffenerSatz(s),
    ),
  )

  const erpapicall = perApi.map((s) => ({
    ID: tabellenIdVon(s),
    ALIAS: s.name,
    FELDER: bestellteFelder(s, benutzteFelder.get(s.id), holSchluessel.get(s.id) ?? []),
  }))
  // DataSets legen ihre Zeilen unter Daten.Tabellen.<ALIAS> ab, dieselbe Form
  // wie MEMTAB.
  const dataset = perDataSet.map((s) => ({
    ID: tabellenIdVon(s),
    ALIAS: s.name,
    FELDER: bestellteFelder(s, benutzteFelder.get(s.id), holSchluessel.get(s.id) ?? []),
  }))
  const sefileloop = geordnet.map((s) => {
    const kopfsatz = kopfsatzVon(s)
    return {
      INDEX_NR: 0,
      ALIAS: s.name,
      ID: tabellenIdVon(s),
      ...(kopfsatz !== '' ? { KOPFSATZ_INDEX: kopfsatz } : {}),
      FELDER: bestellteFelder(s, benutzteFelder.get(s.id), holSchluessel.get(s.id) ?? []),
    }
  })

  const varAbschnitt = varZusammen(
    varAusKopfsaetzen(geordnet),
    offeneSaetze.map((s) => ({
      ID: tabellenIdVon(s),
      FELDER: bestellteFelder(s, benutzteFelder.get(s.id), holSchluessel.get(s.id) ?? []),
    })),
  )
  return escapeNonAsciiJs(
    JSON.stringify({
      ...(varAbschnitt.length > 0 ? { VAR: varAbschnitt } : {}),
      SEFILELOOP: sefileloop,
      ERPAPICALL: erpapicall,
      ...(dataset.length > 0 ? { DATASET: dataset } : {}),
    }, null, 2),
  ) + '\n'
}
