import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { gridSlotRead, gridSlotStyle, type GridSlot } from '../../core/block/grid'
import { areaColumnsStyle } from '../../core/block/gridArea'
import { useEditor } from '../state/useEditor'
import { BlockHost } from './BlockHost'
import { useDnd } from './dndState'
import { dragPosition } from './dragPosition'

function GridGhost({ slot }: { slot: GridSlot }) {
  return (
    <div
      aria-hidden
      data-ff-editor-helper
      style={{
        ...gridSlotStyle(slot),
        pointerEvents: 'none',
        // .dropzone.is-drop-aktiv: 2px dashed, 8 % of the color underneath.
        background: 'hsl(var(--wb-selection) / 0.08)',
        border: '2px dashed hsl(var(--wb-selection))',
        borderRadius: 'var(--radius)',
      }}
    />
  )
}

// The blocks of a grid area, each on its cells, and the ghost of a block
// being dragged over the area.
export function NodeList({ parentId }: { parentId: string }) {
  const ed = useEditor()
  const dnd = useDnd()

  const nodes = ed.childNodesOf(parentId)

  const ghost = dnd.dropTarget !== null && dnd.dropTarget.parentId === parentId ? dnd.dropTarget : null

  return (
    <>
      {nodes.map((node) => <CanvasNode key={node.id} node={node} parentId={parentId} />)}
      {ghost && <GridGhost slot={ghost} />}
    </>
  )
}

function CanvasNode({ node, parentId }: { node: BlockNode; parentId: string }) {
  const ed = useEditor()
  const dnd = useDnd()
  const isContainer = blockType(node.type)?.takesChildren ?? false

  return (
    <div
      onPointerDown={(e) => dragPosition(ed, dnd, e, node, parentId)}
      style={{
        opacity: dnd.dragId === node.id ? 0.4 : 1,
        ...gridSlotStyle(gridSlotRead(node.values)),
        ...areaColumnsStyle(node),
      }}
    >
      <BlockHost
        block={node}
        selected={ed.selectedId === node.id}
        onSelect={() => ed.chooseHit(node.id)}
        grid
      >
        {isContainer && <NodeList parentId={node.id} />}
      </BlockHost>
    </div>
  )
}
