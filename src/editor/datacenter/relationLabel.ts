import { relationSyntaxAsText, type RelationTemplate } from '../../core/data/relations'

export function isUnnamedTemplate(entry: RelationTemplate): boolean {
  const name = entry.name.trim()
  return name === ''
    || name === relationSyntaxAsText(entry)
    || name.startsWith(`${entry.verb}[`)
}

export function relationDisplay(entry: RelationTemplate): string {
  return isUnnamedTemplate(entry) ? `${entry.verb} · Nr. ${entry.nr}` : entry.name
}
