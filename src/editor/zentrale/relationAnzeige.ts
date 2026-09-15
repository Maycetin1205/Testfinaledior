// Wie eine Relations-Vorlage in Listen heisst.
import { relationsSyntaxAlsText, type RelationsVorlage } from '../../core/data/relations'

export function istUngetaufteVorlage(entry: RelationsVorlage): boolean {
  const name = entry.name.trim()
  return name === ''
    || name === relationsSyntaxAlsText(entry)
    || name.startsWith(`${entry.verb}[`)
}

export function relationAnzeige(entry: RelationsVorlage): string {
  return istUngetaufteVorlage(entry) ? `${entry.verb} · Nr. ${entry.nr}` : entry.name
}
