// Felder einer Quelle als Vorschlag fuer die Parameter einer Relation.
import type { Parameter } from '../../core/data/aktionen'
import { relationsParameterVorgabe } from '../../core/data/aktionen'
import { tabellenIdVon, type Datenquelle } from '../../core/data/dataSources'
import {
  relIdAusIdbId,
  feldCodeZerlegen,
  type RelationsVorlage,
} from '../../core/data/relations'

export interface UebernahmeFeld {
  sourceId: string
  sourceName: string
  code: string
  label: string

  // Der Code ohne Feld-Vorsatz, also die reine Form 45_60.
  posLen: string
}

export interface UebernahmeQuelle {
  sourceId: string
  sourceName: string
}

export interface UebernahmeTreffer {
  art: 'pos' | 'len' | 'relid'
  wert: string
}

export interface FeldUebernahmeResult {
  params: Parameter[]
  gesetzt: UebernahmeTreffer[]
}

export type FeldUebernahmeParameterArt = 'pos' | 'len' | 'relid'
export type FeldUebernahmeZiel = 'feld' | 'idb'

export function feldUebernahmeArt(raw: string): FeldUebernahmeParameterArt | null {
  const match = /^(?:([A-Za-z_]+)|\{([A-Za-z_]+)\})$/.exec(raw)
  const name = (match?.[1] ?? match?.[2])?.toUpperCase()
  if (name === 'POS' || name === 'FELD_POS') return 'pos'
  if (name === 'LEN' || name === 'FELD_LEN') return 'len'
  if (name === 'IDBID' || name === 'RELID') return 'relid'
  return null
}

// Eine ERP-Abfrage darf ihren Feldern einen Vorsatz voranstellen; darunter steckt
// trotzdem Position_Laenge.
function feldPosLen(
  source: Datenquelle,
  code: string,
): { pos: string; len: string } | null {
  const vorsatz = source.feldVorsatz ?? ''
  const ohne = vorsatz !== '' && code.startsWith(vorsatz) ? code.slice(vorsatz.length) : code
  return feldCodeZerlegen(ohne)
}

// Position und Laenge sind Position und Laenge: ein Filter auf die ART sperrte
// jede Tabelle aus, die nicht als IDB-Tabelle angelegt ist.
export function uebernahmeFelder(
  dataSources: readonly Datenquelle[],
): UebernahmeFeld[] {
  const felder: UebernahmeFeld[] = []
  for (const source of dataSources) {
    for (const field of source.fields) {
      const pl = feldPosLen(source, field.code)
      if (!pl) continue
      felder.push({
        sourceId: source.id,
        sourceName: source.name,
        code: field.code,
        label: field.label,
        posLen: `${pl.pos}_${pl.len}`,
      })
    }
  }
  return felder
}

// Fuer den RELID-Parameter zaehlt nur, dass die Quelle eine Tabellen-Kennung hat.
export function uebernahmeTabellen(
  dataSources: readonly Datenquelle[],
): UebernahmeQuelle[] {
  return dataSources
    .filter((source) => tabellenIdVon(source) !== '')
    .map((source) => ({ sourceId: source.id, sourceName: source.name }))
}

export function feldUebernehmen(
  params: readonly Parameter[],
  relation: RelationsVorlage,
  source: Datenquelle,
  code: string,
  ziel: FeldUebernahmeZiel,
): FeldUebernahmeResult {
  const defaults = relationsParameterVorgabe(relation)
  const next = relation.params.map((_, index) => ({
    ...(params[index] ?? defaults[index]),
  }))
  const gesetzt: UebernahmeTreffer[] = []

  relation.params.forEach((param, index) => {
    const art = feldUebernahmeArt(param)
    if (ziel === 'idb' && art === 'relid') {
      const relId = relIdAusIdbId(tabellenIdVon(source))
      next[index] = { source: 'fixed', value: relId }
      gesetzt.push({ art, wert: relId })
      return
    }
    if (ziel !== 'feld') return
    const posLen = feldPosLen(source, code)
    if (!posLen) return
    if (art === 'pos') {
      next[index] = { source: 'fixed', value: posLen.pos }
      gesetzt.push({ art, wert: posLen.pos })
    } else if (art === 'len') {
      next[index] = { source: 'fixed', value: posLen.len }
      gesetzt.push({ art, wert: posLen.len })
    }
  })

  return { params: next, gesetzt }
}
