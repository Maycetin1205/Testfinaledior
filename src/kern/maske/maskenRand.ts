// Der Rand der Maske, in dem die Navi sitzt.
import { bausteinArt } from './registry'
import type { Baustein, Maskenbaum } from './baum'

export const RAND = { breite: 56, breiteOffen: 224 } as const

export function istRandBaustein(node: Baustein): boolean {
  return bausteinArt(node.typ)?.maskenRand === true
}

export function randStil(): Record<string, string | number> {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,

    zIndex: 5,
  }
}

export function randPlatzLinks(tree: Maskenbaum): number {
  for (const node of Object.values(tree)) {
    if (node && istRandBaustein(node)) return RAND.breite
  }
  return 0
}
