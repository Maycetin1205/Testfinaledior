// Direkte Auswahl und ihre Zugehoerigkeit zur aktiven Seite.
import { WURZEL_ID, type Maskenbaum } from './baum'
import { seiteVon } from './seiten'

export function auswahlAufSeite(
  tree: Maskenbaum,
  id: string | null,
  seitenWurzel: string,
): string | null {
  if (id === null || !tree[id]) return null
  return seiteVon(tree, id) === seitenWurzel ? id : null
}

export function auswahlZiel(
  tree: Maskenbaum,
  getroffenId: string,
): string | null {
  return tree[getroffenId] && getroffenId !== WURZEL_ID ? getroffenId : null
}
