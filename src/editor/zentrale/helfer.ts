// Gemeinsame Helfer der Kommandozentrale: Klartexte, Optionen, Zaehlungen.
import { Boxes, Database, FileText, Users } from '@/editor/zeichen/zeichen'
import type { Baustein } from '../../kern/maske/baum'
import { bausteinName } from '../../kern/maske/bausteinName'
import type { Wahloption } from '../../kern/maske/eigenschaft'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { auswahlQuelleIdVon } from '../../kern/maske/baumFragen'
import type { Datenquelle, Datenfeld, QuellenArtKennung } from '../../kern/daten/datenquellen'
import type { RelationsVorlage } from '../../kern/daten/relationen'

const KIND_ICONS: Partial<Record<QuellenArtKennung, typeof Database>> = {
  idb: Database,
  adressstamm: Users,
  artikelstamm: Boxes,
  beleg: FileText,
}

export function ikonFuer(kind: QuellenArtKennung): typeof Database {
  return KIND_ICONS[kind] ?? Database
}

export const VERB_KURZ: Record<RelationsVorlage['verb'], string> = {
  GET_RELATION: 'GET',
  PUT_RELATION: 'PUT',
  PUTADD_RELATION: 'PUTADD',
}

export const RELATION_GRUPPEN: Wahloption[] = [
  { value: 'lesen', label: 'Lesen' },
  { value: 'schreiben', label: 'Schreiben' },
]

// Zwei Texte je Platzhalter, weil zwei Stellen ihn zeigen: `name` als
// Beschriftung neben dem rohen Code, `hinweis` in der Parameter-Tabelle.
export const PLATZHALTER_KLARTEXT: Record<string, { name: string; hinweis: string }> = {
  FELD_POS: {
    name: 'Position',
    hinweis: 'Feld-Position (aus dem gebundenen Feld)',
  },
  FELD_LEN: {
    name: 'Länge',
    hinweis: 'Feld-Länge (aus dem gebundenen Feld)',
  },
  PINDEX: {
    name: 'Satznummer',
    hinweis: 'Nummer des Datensatzes',
  },
  SELKEY: {
    name: 'Schlüssel',
    hinweis: 'Schlüssel der gewählten Zeile',
  },
  DROP_PINDEX: {
    name: 'Satznummer der Löschung',
    hinweis: 'Satznummer der Löschzeile (automatisch)',
  },
  RELID: {
    name: 'Tabelle',
    hinweis: 'Tabellen-ID der Datenquelle (ohne IDB-Präfix)',
  },
  VALUE: {
    name: 'Wert',
    hinweis: 'Neuer Wert (z. B. Titel der Zielspalte)',
  },
  ZIMMER: {
    name: 'Zimmer',
    hinweis: 'Titel des Ziel-Zimmers beim Ablegen (leer ohne Zimmer)',
  },
  NOW_DATE: {
    name: 'Heutiges Datum',
    hinweis: 'Heutiges Datum',
  },
}

// Der Klarname eines Parameters, wenn die Vorlage an dieser Stelle GENAU einen
// Platzhalter vorsieht. Alles andere ('L', '45_60', leer) heisst wie es dasteht.
export function platzhalterName(roh: string): string {
  const name = /^\{([A-Za-z0-9_]+)\}$/.exec(roh.trim())?.[1]
  return name === undefined ? '' : PLATZHALTER_KLARTEXT[name]?.name ?? name
}

export function parameterBedeutung(param: string): string {
  if (param === '') return 'Leerer Parameter (Position bleibt erhalten)'
  const gefunden = [...param.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
  if (gefunden.length === 0) return 'Fester Wert'
  return gefunden
    .map((name) => PLATZHALTER_KLARTEXT[name]?.hinweis ?? `Eigener Platzhalter {${name}}`)
    .join(' · ')
}

export interface BlockValueOption {
  key: string
  blockId: string
  prop: string
  label: string
}

export function blockValueKey(blockId: string, prop: string): string {
  return `${encodeURIComponent(blockId)}:${encodeURIComponent(prop)}`
}

export interface AuswahlGeberOption {
  blockId: string
  label: string
  felder: readonly Datenfeld[]
}

// Ein Baustein, der erfasst. Die Spalten kommen generisch
// aus der Listen-Bindung des Bausteins.
export interface ErfassungsOption {
  blockId: string
  label: string

  // Angesprochen wird die Spalte ueber ihre dauerhafte KENNUNG, nie ueber den
  // Platz; Eintraege ohne Kennung sind nicht adressierbar.
  spalten: readonly { kennung: string; titel: string }[]
}

export function erfassungsOptionen(
  traeger: readonly Baustein[],
  sources: readonly Datenquelle[],
): ErfassungsOption[] {
  return traeger.map((node) => {
    const bindung = faehigkeit(bausteinArt(node.type), 'liste')?.bindung
    const kennungKey = bindung?.kennungKey
    const roh = bindung ? node.props[bindung.prop] : undefined
    const spalten = bindung && kennungKey !== undefined && Array.isArray(roh)
      ? roh.flatMap((eintrag) => {
          const e = eintrag as Record<string, unknown>
          const kennung = e[kennungKey]
          if (typeof kennung !== 'string' || kennung === '') return []
          const titel = e[bindung.titelKey]
          return [{
            kennung,
            titel: typeof titel === 'string' && titel !== '' ? titel : bindung.standardTitel,
          }]
        })
      : []
    return { blockId: node.id, label: bausteinName(node, sources), spalten }
  })
}

export function auswahlGeberOptionen(
  geber: readonly Baustein[],
  sources: readonly Datenquelle[],
): AuswahlGeberOption[] {
  return geber.map((node) => {
    const quelle = sources.find((s) => s.id === auswahlQuelleIdVon(node))
    return {
      blockId: node.id,
      label: quelle
        ? `${bausteinName(node, sources)} (${quelle.name})`
        : bausteinName(node, sources),
      felder: quelle?.fields ?? [],
    }
  })
}
