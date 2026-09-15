// Was der Bediener in die Felder einer Datenquelle tippt, sauber gelesen.
import { QUELLEN_TRENNER } from '../maske/bausteinArt'
import { artFuer, type QuellenArtKennung } from './quellenArten'

export function feldCode(pos: string, len: string, vorsatz = ''): string {
  const p = pos.trim()
  const l = len.trim()
  if (!/^\d+$/.test(p) || !/^\d+$/.test(l) || Number(l) < 1) return ''
  return `${feldVorsatzAusEingabe(vorsatz)}${p}_${l}`
}

const VORSATZ_FORM = /^[A-Za-z0-9_]+$/

export function feldVorsatzAusEingabe(raw: string): string {
  const t = raw.trim()
  return t !== '' && VORSATZ_FORM.test(t) ? t : ''
}

const KENNUNG_IDB_KURZ = /^(?:IDB)?ID(\d{1,4})$/i
const KENNUNG_FREI = /^[A-Za-z][A-Za-z0-9.]*$/

// idbKurzform=false laesst 'ID0001' stehen: bei einem DataSet IST das die Kennung.
export function kennungAusEingabe(raw: string, idbKurzform = true): string {
  const t = raw.trim()
  const kurz = idbKurzform ? KENNUNG_IDB_KURZ.exec(t) : null
  if (kurz) return `IDBID${kurz[1].padStart(4, '0')}`
  return KENNUNG_FREI.test(t) ? t : ''
}

const KOPFSATZ_FORM = /^[A-Za-z][A-Za-z0-9]*_\d+_\d+$/

export function kopfsatzAusEingabe(raw: string): string {
  const t = raw.trim()
  return KOPFSATZ_FORM.test(t) ? t : ''
}

export function kennungAnzeige(kennung: string | undefined): string {
  const m = /^IDB(ID\d{4})$/.exec(kennung ?? '')
  return m ? m[1] : (kennung ?? '')
}

export function quellenKennung(source: { art: QuellenArtKennung; idbId?: string }): string {
  const feste = artFuer(source.art).tabellenId
  return feste !== '' ? feste : kennungAnzeige(source.idbId)
}

// Ein DataSet spricht seine Spalten mit der Bezeichnung an. Kein Komma, denn
// FELDER ist eine Komma-Liste, und nicht der Quellen-Trenner, weil „quelle::feld"
// damit mehrdeutig wuerde.
export function spaltenNameAusEingabe(raw: string): string {
  const t = raw.trim()
  if (t === '' || t.includes(',') || t.includes(QUELLEN_TRENNER)) return ''
  return t
}
