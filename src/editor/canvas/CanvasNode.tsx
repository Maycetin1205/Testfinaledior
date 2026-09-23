import { Fragment, type DragEvent } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { mayContain, blockType } from '../../core/block/registry'
import {
  flowHeightStyle,
  flowWidthStyle,
  flowHeightRead,
  flowWidthRead,
  directionTheChildren,
  type Direction,
} from '../../core/block/flow'
import { gridSlotRead, gridSlotStyle, type GridSlot } from '../../core/block/grid'
import { isGridArea } from '../../core/block/gridArea'
import { useEditor } from '../state/useEditor'
import { BlockHost } from './BlockHost'
import { isNewBlockDrag, newBlockDragType } from './dnd'
import { commitDrop, useDnd } from './dndState'
import { cn } from '@/editor/widgets/cn'
import { dragPosition } from './gridMove'

const CONTAINER_EDGE = 12

function RasterGhost({ slot }: { slot: GridSlot }) {
  return (
    <div
      aria-hidden
      data-ff-editor-helper
      style={{
        ...gridSlotStyle(slot),
        pointerEvents: 'none',
        background: 'hsl(var(--wb-selection) / 0.16)',
        border: '2px dashed hsl(var(--wb-selection))',
        borderRadius: 4,
      }}
    />
  )
}

function InsertionLine({ direction }: { direction: Direction }) {
  return (
    <div
      data-ff-editor-helper
      className={cn(
        'self-stretch rounded-[2px] bg-[hsl(var(--wb-selection))]',
        direction === 'column' ? 'h-[2px]' : 'min-h-6 w-[2px]',
      )}
    />
  )
}

export function NodeList(
  { parentId, direction, grid = false, template }:
  { parentId: string; direction: Direction; grid?: boolean; template?: BlockNode },
) {
  const ed = useEditor()
  const dnd = useDnd()

  const all = ed.childNodesOf(parentId)

  const templateChild = blockType(ed.getNode(parentId)?.type ?? '')?.templateKind
  const own = templateChild ? all.find((n) => n.type === templateChild.type) : undefined
  const nodes = own ? all.filter((n) => n.id !== own.id) : all
  const further = template ?? own

  const lineAt = (i: number) =>
    !grid
    && dnd.dropTarget?.kind === 'flow'
    && dnd.dropTarget.parentId === parentId
    && dnd.dropTarget.index === i

  const templateHere = further !== undefined && nodes.length === 0 ? further : undefined
  const templateFurther = further !== undefined && nodes.length > 0 ? further : undefined

  const ghost = grid && dnd.dropTarget?.kind === 'grid' && dnd.dropTarget.parentId === parentId
    ? dnd.dropTarget
    : null

  return (
    <>
      {nodes.map((node, i) => (
        <Fragment key={node.id}>
          {lineAt(i) && <InsertionLine direction={direction} />}
          <CanvasNode
            node={node}
            index={i}
            parentId={parentId}
            listDirection={direction}
            grid={grid}
            template={i === 0 ? templateFurther : undefined}
          />
        </Fragment>
      ))}
      {lineAt(nodes.length) && <InsertionLine direction={direction} />}
      {templateHere && <TemplateNode template={templateHere} fallbackParent={parentId} direction={direction} />}
      {ghost && <RasterGhost slot={ghost} />}
    </>
  )
}

function TemplateNode(
  { template, fallbackParent, direction }:
  { template: BlockNode; fallbackParent: string; direction: Direction },
) {
  const ed = useEditor()
  const parentId = template.parentId ?? fallbackParent
  const index = ed.childNodesOf(parentId).findIndex((n) => n.id === template.id)
  return (
    <CanvasNode
      node={template}
      index={Math.max(0, index)}
      parentId={parentId}
      listDirection={direction}
    />
  )
}

interface CanvasNodeProps {
  node: BlockNode
  index: number
  parentId: string
  listDirection: Direction

  grid?: boolean

  template?: BlockNode
}

function CanvasNode({ node, index, parentId, listDirection, grid = false, template }: CanvasNodeProps) {
  const ed = useEditor()
  const dnd = useDnd()
  const def = blockType(node.type)
  const isContainer = def?.takesChildren ?? false
  const childDirection = directionTheChildren(def, node.values)

  const invalidTarget = (targetParentId: string) =>
    dnd.dragId !== null && ed.isInSubtree(dnd.dragId, targetParentId)

  const onDragStart = (e: DragEvent) => {
    e.stopPropagation()
    dnd.setDragId(node.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
  }

  const onDragOver = (e: DragEvent) => {
    if (dnd.dragId === null && !isNewBlockDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    if (dnd.dragId === node.id) return dnd.setDropTarget(null)
    const rect = e.currentTarget.getBoundingClientRect()

    const draggedType = dnd.dragId !== null
      ? ed.getNode(dnd.dragId)?.type ?? null
      : newBlockDragType(e.dataTransfer)

    const allowedIn = (containerType: string) =>
      draggedType !== null && mayContain(containerType, draggedType)
    const parentType = ed.getNode(parentId)?.type ?? ''

    if (isContainer && !invalidTarget(node.id) && allowedIn(node.type)) {
      const before = listDirection === 'row'
        ? e.clientX < rect.left + CONTAINER_EDGE
        : e.clientY < rect.top + CONTAINER_EDGE
      const after = listDirection === 'row'
        ? e.clientX > rect.right - CONTAINER_EDGE
        : e.clientY > rect.bottom - CONTAINER_EDGE
      if (!before && !after) {
        dnd.setDropTarget({ kind: 'flow', parentId: node.id, index: ed.childNodesOf(node.id).length })
        return
      }
      if (invalidTarget(parentId) || !allowedIn(parentType)) return dnd.setDropTarget(null)
      dnd.setDropTarget({ kind: 'flow', parentId, index: before ? index : index + 1 })
      return
    }

    if (invalidTarget(parentId) || !allowedIn(parentType)) return dnd.setDropTarget(null)
    const after = listDirection === 'row'
      ? e.clientX > rect.left + rect.width / 2
      : e.clientY > rect.top + rect.height / 2
    dnd.setDropTarget({ kind: 'flow', parentId, index: after ? index + 1 : index })
  }

  const content = (
    <BlockHost
      block={node}
      selected={ed.selectedId === node.id}
      onSelect={() => ed.chooseHit(node.id)}
      grid={grid}
    >
      {isContainer && (
        <NodeList
          parentId={node.id}
          direction={childDirection}
          grid={isGridArea(node)}
          template={template}
        />
      )}
    </BlockHost>
  )

  if (grid) {
    return (
      <div
        onPointerDown={(e) => dragPosition(ed, dnd, e, node, parentId)}
        style={{
          opacity: dnd.dragId === node.id ? 0.4 : 1,
          ...gridSlotStyle(gridSlotRead(node.values)),
        }}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        commitDrop(e, ed, dnd)
      }}
      onDragEnd={dnd.reset}
      style={{
        opacity: dnd.dragId === node.id ? 0.4 : 1,
        ...flowWidthStyle(flowWidthRead(node.values.width), listDirection, def?.fixedWidth),
        ...flowHeightStyle(flowHeightRead(node.values.height), listDirection),
      }}
    >
      {content}
    </div>
  )
}
