// „Folgt der Auswahl von …": woran ein Baustein haengt und mit welchen Feldern.
import {
  MAX_SCHLUESSELPAARE,
  vollstaendigePaare,
  type SchluesselPaar,
} from './weitereQuellen'

export interface AuswahlFolge {
  geberId: string

  keyPairs: SchluesselPaar[]
}

export const AUSWAHL_FOLGE_PROP = 'folgtAuswahl'

export const AUSWAHL_FOLGE_DEFAULTS: Record<string, AuswahlFolge[]> = {
  [AUSWAHL_FOLGE_PROP]: [],
}

export function folgeBrauchbar(f: AuswahlFolge): boolean {
  return f.geberId !== '' && vollstaendigePaare(f).length > 0
}

export function auswahlFolgenAus(roh: unknown): AuswahlFolge[] {
  if (!Array.isArray(roh)) return []
  const acc: AuswahlFolge[] = []
  for (const entry of roh) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Record<string, unknown>
    if (typeof e.geberId !== 'string') continue
    const keyPairs: SchluesselPaar[] = []
    for (const p of Array.isArray(e.keyPairs) ? e.keyPairs : []) {
      if (!p || typeof p !== 'object') continue
      const pp = p as Record<string, unknown>
      if (typeof pp.fromField !== 'string' || typeof pp.toField !== 'string') continue
      keyPairs.push({ fromField: pp.fromField, toField: pp.toField })
    }
    acc.push({ geberId: e.geberId, keyPairs: keyPairs.slice(0, MAX_SCHLUESSELPAARE) })
  }
  return acc
}
