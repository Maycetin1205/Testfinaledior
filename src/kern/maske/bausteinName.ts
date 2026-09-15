// Wie ein Baustein in Wahllisten heisst, wenn er keinen eigenen Namen traegt.
import type { Baustein } from './baum'
import { bindungsProp } from './faehigkeiten'
import { bausteinArt } from './registry'
import { bindbareStellenVon, QUELLE_PROP } from './baumFragen'
import { feldKlarname, type Datenquelle } from '../daten/datenquellen'

const TEXT_PROPS = ['label', 'heading', 'title', 'text', 'placeholder'] as const

const MAX_LAENGE = 28

function eigenerText(
  props: Record<string, unknown>,
  defaults?: Record<string, unknown>,

  verdeckt?: ReadonlySet<string>,
): string {
  for (const key of TEXT_PROPS) {
    if (verdeckt?.has(key)) continue
    const value = props[key]
    if (typeof value !== 'string' || value.trim() === '') continue
    if (defaults && value === defaults[key]) continue
    const text = value.trim()
    return text.length > MAX_LAENGE ? `${text.slice(0, MAX_LAENGE - 1)}…` : text
  }
  return ''
}

// Die Props, deren Text der Bediener gerade nicht sieht: an einer gebundenen
// Stelle steht im Feld der Klarname des Feldes. Ein Name aus dem verdeckten Text
// widerspraeche dem Bild.
function verdeckteProps(node: Baustein): Set<string> {
  const raus = new Set<string>()
  for (const stelle of bindbareStellenVon(node)) {
    const bindung = String(node.werte[bindungsProp(stelle.prop)] ?? '')
    if (bindung !== '') raus.add(stelle.vorschauProp ?? stelle.prop)
  }
  return raus
}

function gebundenerAlias(node: Baustein, quellen: readonly Datenquelle[]): string {
  const eigeneQuelle = String(node.werte[QUELLE_PROP] ?? '')
  for (const stelle of bindbareStellenVon(node)) {
    const bindung = String(node.werte[bindungsProp(stelle.prop)] ?? '')
    if (bindung === '') continue
    const alias = feldKlarname(bindung, eigeneQuelle, quellen)
    if (alias !== '') return alias
  }
  return ''
}

export function bausteinName(node: Baustein, quellen: readonly Datenquelle[]): string {
  const def = bausteinArt(node.typ)
  const text = eigenerText(node.werte, def?.vorgaben, verdeckteProps(node))
  if (text !== '') return text
  const alias = gebundenerAlias(node, quellen)
  if (alias !== '') return alias
  return def?.name ?? node.typ
}
