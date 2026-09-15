// Der Stil eines Bausteins in der exportierten Maske.
import type { Baustein } from '../kern/maske/baum'
import {
  flussHoeheStil,
  flussBreiteStil,
  flussHoeheLesen,
  flussBreiteLesen,
  type Richtung,
  type FlussBreite,
} from '../kern/maske/fluss'
import { istRandBaustein, randStil } from '../kern/maske/maskenRand'
import { rasterPlatzLesen, rasterPlatzStil } from '../kern/maske/raster'
import { stilAlsCss } from '../kern/maske/stilCss'
import { escapeHtmlAttr } from './serializer'

export function styleAttr(
  node: Baustein,
  parentDirection: Richtung,
  lockedWidth: FlussBreite | undefined,
  rasterEbene: boolean,
  istPage: boolean,
): string {
  let style: Record<string, string | number>
  if (istPage) {
    style = {}
  } else if (istRandBaustein(node)) {
    style = randStil()
  } else if (rasterEbene) {
    style = rasterPlatzStil(rasterPlatzLesen(node.werte))
  } else {
    style = {
      ...flussBreiteStil(flussBreiteLesen(node.werte.width), parentDirection, lockedWidth),

      ...flussHoeheStil(flussHoeheLesen(node.werte.height), parentDirection),
    }
  }
  const css = stilAlsCss(style)
  return css ? ` style="${escapeHtmlAttr(css)}"` : ''
}
