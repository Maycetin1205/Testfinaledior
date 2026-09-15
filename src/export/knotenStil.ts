// Der Stil eines Bausteins in der exportierten Maske.
import type { Baustein } from '../core/blocks/BlockData'
import {
  flussHoeheStil,
  flussBreiteStil,
  flussHoeheLesen,
  flussBreiteLesen,
  type Richtung,
  type FlussBreite,
} from '../core/blocks/flowLayout'
import { istRandBaustein, randStil } from '../core/blocks/maskenRand'
import { rasterPlatzLesen, rasterPlatzStil } from '../core/blocks/rasterLayout'
import { stilAlsCss } from '../core/blocks/styleCss'
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
    style = rasterPlatzStil(rasterPlatzLesen(node.props))
  } else {
    style = {
      ...flussBreiteStil(flussBreiteLesen(node.props.width), parentDirection, lockedWidth),

      ...flussHoeheStil(flussHoeheLesen(node.props.height), parentDirection),
    }
  }
  const css = stilAlsCss(style)
  return css ? ` style="${escapeHtmlAttr(css)}"` : ''
}
