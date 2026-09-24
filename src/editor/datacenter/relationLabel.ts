import { isUnnamedTemplate, type RelationTemplate } from '../../core/data/relations'

export function relationDisplay(entry: RelationTemplate): string {
  return isUnnamedTemplate(entry) ? `${entry.verb} · Nr. ${entry.nr}` : entry.name
}
