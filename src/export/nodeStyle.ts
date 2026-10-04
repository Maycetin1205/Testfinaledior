import type { BlockNode } from '../core/block/tree'
import { gridSlotRead, gridSlotStyle } from '../core/block/grid'
import { areaColumnsStyle, growMinHeightStyle } from '../core/block/gridArea'
import { styleAsCss } from '../core/block/styleCss'
import { escapeHtmlAttr } from './serializer'

// The inline style of a block in the export: its place on the grid. A page
// has none, it is the grid.
export function styleAttr(node: BlockNode, isPage: boolean): string {
  if (isPage) return ''
  const css = styleAsCss({
    ...gridSlotStyle(gridSlotRead(node.values)),
    ...growMinHeightStyle(node),
    ...areaColumnsStyle(node),
  })
  return css ? ` style="${escapeHtmlAttr(css)}"` : ''
}
