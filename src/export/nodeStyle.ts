import type { BlockNode } from '../core/block/tree'
import {
  flowHeightStyle,
  flowWidthStyle,
  flowHeightRead,
  flowWidthRead,
  type Direction,
  type FlowWidth,
} from '../core/block/flow'
import { gridSlotRead, gridSlotStyle } from '../core/block/grid'
import { styleAsCss } from '../core/block/styleCss'
import { escapeHtmlAttr } from './serializer'

export function styleAttr(
  node: BlockNode,
  parentDirection: Direction,
  lockedWidth: FlowWidth | undefined,
  gridLevel: boolean,
  isPage: boolean,
): string {
  let style: Record<string, string | number>
  if (isPage) {
    style = {}
  } else if (gridLevel) {
    style = gridSlotStyle(gridSlotRead(node.values))
  } else {
    style = {
      ...flowWidthStyle(flowWidthRead(node.values.width), parentDirection, lockedWidth),

      ...flowHeightStyle(flowHeightRead(node.values.height), parentDirection),
    }
  }
  const css = styleAsCss(style)
  return css ? ` style="${escapeHtmlAttr(css)}"` : ''
}
