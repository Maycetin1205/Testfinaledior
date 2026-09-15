// Zwischen der Eingabezeile (Klarname, Position, Laenge) und dem Feldcode der
// Quelle umrechnen. Eigene Datei, weil eine Komponenten-Datei nur Komponenten
// ausliefern darf.
import {
  feldCode,
  spaltenNameAusEingabe,
  ZEICHEN_MAX,
  type Datenfeld,
} from '../../core/data/dataSources'

import { feldCodeZerlegen } from '../../core/data/relations'

export interface FeldZeile {
  label: string
  pos: string
  len: string
  rawCode: string

  // Leer heisst: keine Angabe. Die Spalte bekommt dann den mittleren Anteil.
  zeichen: string
}

export const LEERE_ZEILE: FeldZeile = {
  label: '', pos: '', len: '', rawCode: '', zeichen: '',
}

export function zeileFromField(
  f: Datenfeld, vorsatz = '', spaltenNamen = false,
): FeldZeile {
  // Bei spaltenNamen ist der Code der Spaltenname, auch wenn er wie
  // Position_Laenge aussieht.
  const zeichen = f.zeichen === undefined ? '' : String(f.zeichen)
  if (spaltenNamen) return { label: f.label, pos: '', len: '', rawCode: f.code, zeichen }
  const ohneVorsatz = vorsatz !== '' && f.code.startsWith(vorsatz)
    ? f.code.slice(vorsatz.length)
    : f.code
  const pl = feldCodeZerlegen(ohneVorsatz)
  return {
    label: f.label,
    pos: pl?.pos ?? '',
    len: pl?.len ?? '',
    rawCode: pl ? '' : f.code,
    zeichen,
  }
}

// spaltenNamen=true: der Code IST der eingetippte Spaltenname. Sonst entsteht er
// aus Position und Laenge.
export function zeilenCode(z: FeldZeile, vorsatz = '', spaltenNamen = false): string {
  if (spaltenNamen) return spaltenNameAusEingabe(z.rawCode)
  if (z.pos.trim() === '' && z.len.trim() === '' && z.rawCode !== '') return z.rawCode
  return feldCode(z.pos, z.len, vorsatz)
}

export function zeileGefuellt(z: FeldZeile): boolean {
  return z.label.trim() !== '' || zeilenCode(z) !== ''
}

// Aus dem Getippten die Zahl, die an das Feld geht. Nichts Getipptes und alles
// Unsinnige heisst: keine Angabe.
export function zeilenZeichen(z: FeldZeile): number | undefined {
  const roh = Number(z.zeichen.trim())
  if (z.zeichen.trim() === '' || !Number.isFinite(roh) || roh < 1) return undefined
  return Math.min(ZEICHEN_MAX, Math.round(roh))
}
