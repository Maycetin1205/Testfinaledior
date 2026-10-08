import {
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
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
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { OPENED_BY_PROP, openerOf, opensByClick } from '../../core/block/opening'
import { useEditorInstance } from '../state/EditorContext'
import { useView } from '../state/useView'
import { followableByClick, followByClick } from '../bar/followOffer'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { BlockBar } from '../bar/BlockBar'
import { ColumnControls } from './ColumnControls'
import { useFieldBinding } from './useFieldBinding'
import { useAreaPickStart } from './useAreaPickStart'
import { openLookupInEditor } from './lookupWindowState'
import { Grip } from './Grip'
import { GRIPS, useBlockResize } from './useBlockResize'
import { useLitElement } from './useLitElement'

interface BlockHostProps {
  block: BlockNode
  selected?: boolean

  onSelect?: () => void

  grid?: boolean

  children?: ReactNode
}

const NO_SOURCES: readonly SourceInReach[] = []

export function BlockHost({ block, selected, onSelect, grid = false, children }: BlockHostProps) {
  const editor = useEditorInstance()
  const view = useView()
  const follower = view.followPickFor
  const opener = view.areaPickFor
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

  const { containerRef, elementRef, element, spotClickOf } = useLitElement({
    editor,
    blockRef,
    block,
    selected,
    bindableSpots,
    sources,
    grid,
  })

  const { onClick, onDoubleClick, pickers, columnOpen, openEntry } = useFieldBinding({
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
    spotClickOf,
    onSelect,
  })

  const areaPickStart = useAreaPickStart(editor, blockRef, spotClickOf)

  const { startGridResize, resetGridSize } = useBlockResize(editor, blockRef, rootRef)

  const gridSpec = gridMetricsOf(def)

  const gridDraggable = grid

  // While a block waits for what it follows, only a giver or a form field
  // answers a click; a click elsewhere goes on to the canvas, which ends the
  // waiting.
  const toFollow = follower !== null && followableByClick(block, follower)

  // While a block waits for the area it opens, only an area answers that does
  // not hold the block; the areas it opens already stand marked.
  const toOpen = opener !== null && opener !== block.id && opensByClick(block)
    && !editor.isInSubtree(block.id, opener)
  const opensHere = toOpen && openerOf(block) === opener

  return (
    <div
      ref={rootRef}
      onClick={(e) => {
        if (opener !== null) {
          if (!toOpen) return
          e.stopPropagation()
          editor.updateProperty(block.id, OPENED_BY_PROP, opensHere ? '' : opener)
          editor.pickAreaFor(null)
          return
        }
        if (follower !== null) {
          if (!toFollow) return
          e.stopPropagation()
          const node = editor.getNode(follower)
          const next = node ? followByClick(node, block, library) : null
          if (next) editor.updateProperty(follower, SELECTION_FOLLOW_PROP, next)
          editor.pickFollowFor(null)
          return
        }
        if (spotClickOf(e.nativeEvent)?.kind === 'lookupWindow' && searchWindow !== undefined
          && elementRef.current && openLookupInEditor(editor, elementRef.current, block.id, searchWindow, 0)) {
          e.stopPropagation()
          onSelect?.()
          return
        }
        areaPickStart.onClick(e)
        onClick(e)
      }}
      onDoubleClick={(e) => {
        areaPickStart.onDoubleClick()
        onDoubleClick(e)
      }}
      data-block-id={block.id}
      style={{
        display: 'block',
        position: 'relative',

        height: '100%',
        cursor: selected ? 'default' : 'pointer',
        outline: selected
          ? '2px solid hsl(var(--wb-selection))'
          : opensHere ? '2px solid hsl(var(--wb-selection))'
            : toFollow || toOpen ? '2px dashed hsl(var(--wb-selection))' : '2px solid transparent',
        outlineOffset: 1,
        borderRadius: 'var(--radius)',
        userSelect: 'none',
      }}
    >
      <div
        ref={containerRef}
        style={{
          pointerEvents: 'auto',
          height: '100%',
        }}
      >
        {element && isContainer && children != null
          ? createPortal(children, element)
          : null}
      </div>
      {pickers}
      {list?.entryHeads === true && (
        <ColumnControls
          block={block}
          selected={selected === true}
          open={openEntry}
          binding={list}
          element={element}
          host={rootRef}
          container={containerRef}
          onSelect={onSelect}
        />
      )}
      {selected && !columnOpen && (
        <BlockBar
          block={block}
          def={def}
          onRemove={() => editor.removeBlock(blockRef.current.id)}
        />
      )}

      {selected && gridDraggable && GRIPS
        .filter((edge) => !gridSpec.heightFixed || edge === 'e' || edge === 'w')
        .map((edge) => (
          <Grip
            key={edge}
            edge={edge}
            onStart={(e) => startGridResize(e, edge)}
            onReset={() => resetGridSize(edge)}
          />
        ))}
    </div>
  )
}
