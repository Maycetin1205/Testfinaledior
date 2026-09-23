import {
  useLayoutEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/editor/widgets/cn'
import type { BlockNode } from '../../core/block/tree'
import {
  sourcesResolve,
  EXTRA_SOURCES_PROP,
  type SourceInReach,
} from '../../core/data/extraSources'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { gridMetricsOf } from '../../core/block/grid'
import { bindableSpotsOf, SOURCE_PROP, carriesOwnSource } from '../../core/block/treeQuery'
import { useEditorInstance } from '../state/EditorContext'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { SelectionBar } from './SelectionBar'
import { ColumnControls } from './ColumnControls'
import { useFieldBinding } from './useFieldBinding'
import { openLookupInEditor } from './lookupWindowState'
import { useBlockResize } from './useBlockResize'
import { useLitElement } from './useLitElement'

interface BlockHostProps {
  block: BlockNode
  selected?: boolean

  onSelect?: () => void

  grid?: boolean

  children?: ReactNode
}

const NO_SOURCES: readonly SourceInReach[] = []

const GRAB_EDGE = 10

export function BlockHost({ block, selected, onSelect, grid = false, children }: BlockHostProps) {
  const editor = useEditorInstance()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const def = blockType(block.type)
  const isContainer = def?.takesChildren ?? false
  const list = capability(def, 'list')?.binding
  const searchWindow = capability(def, 'lookupWindow')?.window

  const sourcesLibrary = useDataSources()

  const bindableSpots = useMemo(() => bindableSpotsOf(block), [block])

  const carrier = sourcesCarrier(editor.tree, block.id)
  const needs = bindableSpots.length > 0 || carriesOwnSource(block)
  const library = sourcesLibrary.list
  const sources = useMemo(
    () => (needs && carrier
      ? sourcesResolve(carrier.values[SOURCE_PROP], carrier.values[EXTRA_SOURCES_PROP], library)
      : NO_SOURCES),
    [needs, carrier, library],
  )

  const blockRef = useRef<BlockNode>(block)
  useLayoutEffect(() => {
    blockRef.current = block
  })

  const { containerRef, elementRef, element } = useLitElement({
    editor,
    blockRef,
    block,
    selected,
    bindableSpots,
    sources,
    grid,
  })

  const { onClick, onDoubleClick, pickers } = useFieldBinding({
    editor,
    blockRef,
    block,
    selected,
    bindableSpots,
    listBinding: list,
    searchWindow,
    sources,
    containerRef,
    element,
    onSelect,
  })

  const windowSpot = searchWindow?.spot
  const onWindowSpot = (e: ReactMouseEvent<HTMLDivElement>): number | null => {
    if (windowSpot === undefined) return null
    for (const t of e.nativeEvent.composedPath()) {
      if (t === e.currentTarget) return null
      if (t instanceof HTMLElement && t.matches(windowSpot)) {
        const slot = Number(t.getAttribute('data-ff-entry'))
        return Number.isInteger(slot) && slot >= 0 ? slot : 0
      }
    }
    return null
  }

  const { startGridResize } = useBlockResize(editor, blockRef, rootRef)

  const gridSpec = gridMetricsOf(def)

  const gridDraggable = grid

  return (
    <div
      ref={rootRef}
      onClick={(e) => {
        const slot = onWindowSpot(e)
        if (slot !== null && searchWindow !== undefined && elementRef.current
          && openLookupInEditor(editor, elementRef.current, block.id, searchWindow, slot)) {
          e.stopPropagation()
          editor.setSection('lookupWindow', true)
          onSelect?.()
          return
        }
        onClick(e)
      }}
      onDoubleClick={onDoubleClick}
      data-block-id={block.id}
      style={{
        display: 'block',
        position: 'relative',

        height: '100%',
        cursor: selected ? 'default' : 'pointer',
        outline: selected ? '2px solid hsl(var(--wb-selection))' : '2px solid transparent',
        outlineOffset: 1,
        borderRadius: 6,
        userSelect: 'none',
      }}
    >
      <div
        ref={containerRef}
        style={{
          pointerEvents: 'auto',
          height: '100%',

          ...(isContainer && def?.containerFrame !== false
            ? {
                border: '1.5px dashed hsl(var(--wb-line))',
                borderRadius: 4,
                minHeight: 40,
              }
            : null),

          ...(isContainer && grid ? { padding: GRAB_EDGE, boxSizing: 'border-box' as const } : null),
        }}
      >
        {element && isContainer && children != null
          ? createPortal(children, element)
          : null}
      </div>
      {pickers}
      {list?.entrySpots !== undefined && (
        <ColumnControls
          block={block}
          binding={list}
          selector={list.entrySpots}
          element={element}
          host={rootRef}
          container={containerRef}
          onSelect={onSelect}
        />
      )}
      {selected && (
        <SelectionBar
          block={block}
          def={def}
          host={rootRef}
          onRemove={editor.isRemoveProtected(block.id) ? undefined : () => editor.removeBlock(blockRef.current.id)}
        />
      )}

      {selected && gridDraggable && gridSpec.widthDraggable && (
        <Handle
          axis="x"
          onStart={(e) => startGridResize(e, 'x')}
          onReset={() => {
            const node = blockRef.current
            editor.updateProperty(node.id, 'gridW', gridMetricsOf(blockType(node.type)).startWidth)
          }}
        />
      )}
      {selected && gridDraggable && (
        <Handle
          axis="y"
          onStart={(e) => startGridResize(e, 'y')}
          onReset={() => {
            const node = blockRef.current
            editor.updateProperty(node.id, 'gridH', gridMetricsOf(blockType(node.type)).startHeight)
          }}
        />
      )}
    </div>
  )
}

interface HandleProps {
  axis: 'x' | 'y'
  onStart: (e: ReactPointerEvent<HTMLDivElement>) => void
  onReset: () => void
}

function Handle({ axis, onStart, onReset }: HandleProps) {
  return (
    <div
      draggable={false}
      onPointerDown={onStart}
      onDragStart={(e) => e.preventDefault()}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onReset()
      }}
      className={cn(
        'absolute rounded-[4px] bg-[hsl(var(--wb-selection))]',
        axis === 'x'
          ? '-right-1 top-1/2 h-[26px] w-[7px] -translate-y-1/2 cursor-ew-resize'
          : '-bottom-1 left-1/2 h-[7px] w-[26px] -translate-x-1/2 cursor-ns-resize',
      )}
    />
  )
}
