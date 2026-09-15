// Der Name der Maske: eine Eigenschaft der Maskenwurzel.
import { WURZEL_ID, type Maskenbaum } from './baum'

// Der Export schreibt ihn als <title>, und genau der ist der Anmeldename der
// Maske bei SoftEngine.
export const MASKEN_NAME_PROP = 'maskenName'
export const MASKEN_NAME_STANDARD = 'Maske'

export function maskenNameVon(tree: Maskenbaum): string {
  const roh = tree[WURZEL_ID]?.props[MASKEN_NAME_PROP]
  const name = typeof roh === 'string' ? roh.trim() : ''
  return name === '' ? MASKEN_NAME_STANDARD : name
}
