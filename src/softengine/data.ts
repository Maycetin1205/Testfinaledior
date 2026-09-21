// Die gelieferten Daten lesen: Quellen, Zeilen, Felder, Satznummern.
import { pruefeHolWert, type HolWert } from '../kern/daten/holWert'
import { POS_LEN, pruefeLadeRelation, type LadeRelation } from '../kern/daten/ladeRelation'
import { geholteZeilenFuer } from './geholteZeilen'

export type Objekt = Record<string, unknown>

export function istObjekt(v: unknown): v is Objekt {
  return typeof v === 'object' && v !== null
}

export type LaufzeitLadeRelation = LadeRelation & { zusatzFelder: readonly string[] }

// Die Feldnamen reisen MIT: ohne sie wuesste der Wert-Lader nicht, unter welchem
// Namen er die Antwort ablegen soll.
export type LaufzeitHolWert = HolWert & { felder: readonly string[] }

// Eine ERP-Abfrage, die die Maske nach dem Oeffnen selbst stellt.
export interface LaufzeitAbfrage {
  id: string
  felder: string
}

export interface LaufzeitQuelle {
  id: string
  name: string
  tabellenId: string
  satzFeld: string

  // Diese Quelle ist keine Liste, sondern DER Satz, der gerade offen ist.
  offenerSatz: boolean
  ladeRelation?: LaufzeitLadeRelation
  holWert?: LaufzeitHolWert
  abfrage?: LaufzeitAbfrage
}

export function quelleAusListe(list: unknown, id: string): LaufzeitQuelle | undefined {
  if (!Array.isArray(list) || id === '') return undefined
  for (const entry of list) {
    if (!istObjekt(entry) || entry.id !== id) continue
    if (typeof entry.name !== 'string' || typeof entry.tabellenId !== 'string') continue

    let ladeRelation: LaufzeitLadeRelation | undefined
    const geprueft = pruefeLadeRelation(entry.ladeRelation)
    if (geprueft && istObjekt(entry.ladeRelation)) {
      const zf = entry.ladeRelation.zusatzFelder
      const zusatzFelder = Array.isArray(zf)
        ? zf.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
        : []
      ladeRelation = { ...geprueft, zusatzFelder }
    }

    let holWert: LaufzeitHolWert | undefined
    const gepruefterWert = pruefeHolWert(entry.holWert)
    if (gepruefterWert && istObjekt(entry.holWert)) {
      const roh = entry.holWert.felder
      const felder = Array.isArray(roh)
        ? roh.filter((f): f is string => typeof f === 'string' && f !== '')
        : []
      holWert = { ...gepruefterWert, felder }
    }

    const roheAbfrage = entry.abfrage
    const abfrage = istObjekt(roheAbfrage) && typeof roheAbfrage.id === 'string'
      && roheAbfrage.id !== '' && typeof roheAbfrage.felder === 'string'
      ? { id: roheAbfrage.id, felder: roheAbfrage.felder }
      : undefined
    return {
      id,
      name: entry.name,
      tabellenId: entry.tabellenId,
      satzFeld: typeof entry.satzFeld === 'string' ? entry.satzFeld : '',
      offenerSatz: entry.offenerSatz === true,
      ...(ladeRelation ? { ladeRelation } : {}),
      ...(holWert ? { holWert } : {}),
      ...(abfrage ? { abfrage } : {}),
    }
  }
  return undefined
}

// SoftEngine legt die Zeilen je Abfrage unter einen anderen Namen
// (ARTIKELLISTE.ARTIKEL, CHARGENLISTE.CHARGE, IDBID0001LISTE.IDBID0001, Echttest
// 21.09.); gemeinsam ist nur die Endung LISTE. Eine einzelne Zeile kann ohne
// Liste kommen, damit rechnet SoftEngines eigene Vorlage RGBP07.
export function zeilenAusAbfrageAntwort(raw: unknown): unknown[] | undefined {
  let antwort = raw
  if (typeof antwort === 'string') {
    try { antwort = JSON.parse(antwort) } catch { return undefined }
  }
  if (!istObjekt(antwort) || Array.isArray(antwort)) return undefined
  const schluessel = Object.keys(antwort).find((k) => /LISTE$/i.test(k))
  if (schluessel === undefined) return undefined
  const liste = antwort[schluessel]
  if (Array.isArray(liste)) return liste
  if (!istObjekt(liste)) return []
  const inhalte = Object.values(liste)
  const reihe = inhalte.find((v): v is unknown[] => Array.isArray(v))
  if (reihe) return reihe
  const einzeln = inhalte.find(istObjekt)
  return einzeln === undefined ? [] : [einzeln]
}

// SoftEngine liefert ein Feld mal blank, mal als Kasten {WERT: ...}. Ohne das
// Auspacken stuende woertlich "[object Object]" in der Zelle, und weil das nicht
// leer ist, griffe der Rueckfall in feldLesen nie.
function asTrimmedString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object' && !Array.isArray(v)) {
    const inhalt = (v as Record<string, unknown>).WERT
    return inhalt == null || typeof inhalt === 'object' ? '' : String(inhalt).trim()
  }
  return String(v).trim()
}

export function feldLesen(row: unknown, code: string): string {
  if (!istObjekt(row) || code === '') return ''
  const key = code.trim()
  const direct = asTrimmedString(row[key])
  if (direct !== '') return direct
  for (const rk of Object.keys(row)) {
    if (rk === key || rk.startsWith(`${key}_`) || rk.endsWith(`_${key}`)) {
      const v = asTrimmedString(row[rk])
      if (v !== '') return v
    }
  }
  const m = /^(\d+)_(\d+)$/.exec(key)
  if (!m) return ''

  const rohQuelle = row.SATZNEU ?? row.SATZ ?? row.satzneu ?? row.satz ?? row.RAW ?? row.raw
  const raw = rohQuelle == null ? '' : String(rohQuelle)
  if (raw === '') return ''
  const pos = Number(m[1])
  const len = Number(m[2])
  if (len <= 0) return ''
  return raw.substring(pos, pos + len).trim()
}

// Die Satznummer EINER Zeile, die Ketten als {PINDEX} weitergeben. Die eine
// Stelle dafuer, statt einer Kopie je Baustein.
export function satzIndexVon(source: { satzFeld: string }, row: unknown): string {
  return source.satzFeld === '' ? '' : feldLesen(row, source.satzFeld)
}

export function feldSchreiben(row: unknown, code: string, value: string): boolean {
  if (!istObjekt(row) || code === '') return false
  const key = code.trim()
  let written = false

  for (const rk of Object.keys(row)) {
    if (rk === key || rk.startsWith(`${key}_`) || rk.endsWith(`_${key}`)) {
      row[rk] = value
      written = true
    }
  }

  const m = /^(\d+)_(\d+)$/.exec(key)
  if (m) {
    const rawKeys = ['SATZNEU', 'SATZ', 'satzneu', 'satz', 'RAW', 'raw'] as const
    const rawKey = rawKeys.find((k) => typeof row[k] === 'string')
    if (rawKey) {
      const raw = row[rawKey] as string
      const pos = Number(m[1])
      const len = Number(m[2])
      if (len > 0) {
        const field = value.length > len ? value.slice(0, len) : value.padEnd(len, ' ')
        const padded = raw.length < pos ? raw.padEnd(pos, ' ') : raw
        row[rawKey] = padded.slice(0, pos) + field + padded.slice(pos + len)
        written = true
      }
    }
  }
  return written
}

function rowsOfEntry(entry: unknown): unknown[] {
  if (!istObjekt(entry)) return Array.isArray(entry) ? entry : []
  const candidates = [
    entry.Zeilen, entry.zeilen, entry.Saetze, entry.saetze,
    entry.Rows, entry.rows, entry.Daten, entry.daten,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
    if (typeof c === 'string') {
      try {
        const parsed: unknown = JSON.parse(c)
        if (Array.isArray(parsed)) return parsed
      } catch { /* kein JSON -> nächster Kandidat */ }
    }
  }
  return []
}

function sameAlias(a: unknown, alias: string): boolean {
  return asTrimmedString(a).toLowerCase() === alias.trim().toLowerCase()
}

function varBlockVon(daten: Objekt): Objekt | undefined {
  for (const key of ['Var', 'VAR', 'var']) {
    const block = daten[key]
    if (istObjekt(block)) return block
  }
  return undefined
}

// Der offene Satz liegt im VAR-Abschnitt unter der Tabellen-ID, mit
// WINDOW_VARIABLE als Rueckfall (kontrakte.md 6). Aus dem Fenster kommt nur, was
// zu DIESER Tabelle gehoert, sonst zoege ein fremder Eintrag in den Satz ein.
// Herausgereicht wird EINE Zeile, damit jede vorhandene Bindung weiterliest.
function offenerSatzZeilen(seData: unknown, tableId: string): unknown[] {
  if (!istObjekt(seData) || !istObjekt(seData.Daten)) return []
  const id = tableId.trim()
  if (id === '') return []
  const varBlock = varBlockVon(seData.Daten)
  if (!varBlock) return []

  const satz: Objekt = {}
  const fenster = varBlock.WINDOW_VARIABLE ?? varBlock.Window_Variable
  if (istObjekt(fenster)) {
    const vorsatz = id.toUpperCase() + '_'
    for (const key of Object.keys(fenster)) {
      if (key.toUpperCase().startsWith(vorsatz)) satz[key] = fenster[key]
    }
  }
  const eigen = varBlock[id] ?? varBlock[id.toUpperCase()]
  if (istObjekt(eigen)) {
    for (const key of Object.keys(eigen)) {
      if (asTrimmedString(eigen[key]) !== '' || !(key in satz)) satz[key] = eigen[key]
    }
  }
  return Object.keys(satz).length === 0 ? [] : [satz]
}

export function zeilenAusLieferung(
  seData: unknown,
  alias: string,
  idbId: string,

  // Ohne den Schalter bleibt VAR ungelesen: eine Listen-Quelle mit leerer
  // Schleife soll nicht heimlich den Kopfsatz als Zeile ausgeben.
  offenerSatz = false,
): unknown[] {
  if (!istObjekt(seData) || !istObjekt(seData.Daten)) return []
  if (offenerSatz) return offenerSatzZeilen(seData, idbId)
  const daten = seData.Daten

  const sfl = daten.SEFileLoop
  if (Array.isArray(sfl)) {
    for (const entry of sfl) {
      if (istObjekt(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  } else if (istObjekt(sfl)) {
    for (const key of Object.keys(sfl)) {
      const entry = sfl[key]
      if (sameAlias(key, alias)
        || (istObjekt(entry) && (sameAlias(entry.ALIAS, alias) || sameAlias(entry.alias, alias)))) {
        const rows = rowsOfEntry(entry)
        if (rows.length > 0) return rows
      }
    }
  }

  for (const key of ['ErpApiCall', 'ERPAPICALL', 'erpapicall']) {
    const api = daten[key]
    if (!istObjekt(api)) continue
    for (const eintrag of Object.keys(api)) {
      if (!sameAlias(eintrag, alias)) continue
      const rows = rowsOfEntry(api[eintrag])
      if (rows.length > 0) return rows
    }
  }

  const tab = daten.Tabellen
  if (istObjekt(tab)) {
    const keys = [alias, alias.toUpperCase(), alias.toLowerCase(), idbId]
    for (const key of keys) {
      if (key !== '' && key in tab) {
        const rows = rowsOfEntry(tab[key])
        if (rows.length > 0) return rows
      }
    }
    for (const key of Object.keys(tab)) {
      if (sameAlias(key, alias)) {
        const rows = rowsOfEntry(tab[key])
        if (rows.length > 0) return rows
      }
    }
  }

  return geholteZeilenFuer(alias) ?? []
}

export function datenAusInhalt(raw: unknown): Objekt | undefined {
  let data = raw
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return undefined }
  }
  if (!istObjekt(data) || !istObjekt(data.Daten)) return undefined
  const daten = data.Daten
  if (!daten.SEFileLoop && !daten.Tabellen && !daten.ErpApiCall && !varBlockVon(daten)) {
    return undefined
  }
  return daten
}

export function nachrichtenInhalt(eventData: unknown): unknown {
  let d = eventData
  if (typeof d === 'string') {
    try { d = JSON.parse(d) } catch { return undefined }
  }
  if (!istObjekt(d) || !istObjekt(d.MSG)) return undefined
  return d.MSG.DATA
}
