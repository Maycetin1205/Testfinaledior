import { useLayoutEffect, useRef, type RefObject } from 'react'
import { Link2, Minus, Plus, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import type { BlockNode } from '../../core/block/tree'
import type { BlockType } from '../../core/block/blockType'
import { capability } from '../../core/block/capability'
import { useEditorInstance } from '../state/EditorContext'
import { firstDescendantOfType, canCompute } from '../../core/block/treeQuery'
import { fieldPlainName } from '../../core/data/dataSources'

interface SelectionBarProps {
  block: BlockNode
  def: BlockType | undefined

  host: RefObject<HTMLElement | null>

  onRemove?: () => void
}

type Placement = 'top' | 'bottom' | 'right' | 'inside'

const BAR = 30
const WIDTH = 150

function nextAncestor(el: HTMLElement): HTMLElement | null {
  const slot = el.assignedSlot
  if (slot) return slot.parentElement
  if (el.parentElement) return el.parentElement
  const root = el.getRootNode()
  return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null
}

function clipParent(el: HTMLElement): HTMLElement | null {
  let p = nextAncestor(el)
  while (p) {
    if (getComputedStyle(p).overflow !== 'visible') return p
    p = nextAncestor(p)
  }
  return null
}

interface Limit {
  top: number
  bottom: number
  left: number
  right: number
}

function limitOf(el: HTMLElement): Limit {
  const clip = clipParent(el)
  return clip
    ? clip.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
}

function placementFor(el: HTMLElement | null): Placement {
  if (el === null) return 'inside'
  const r = el.getBoundingClientRect()
  const limit = limitOf(el)
  if (r.width >= WIDTH) {
    if (r.top - BAR >= limit.top) return 'top'
    if (r.bottom + BAR <= limit.bottom) return 'bottom'
  }
  if (r.width < WIDTH && r.right + WIDTH <= limit.right) return 'right'
  return 'inside'
}

const STYLE: Record<Placement, { top: string; bottom: string; right: string; left: string }> = {
  top: { top: `${-BAR}px`, bottom: 'auto', right: '0px', left: 'auto' },
  bottom: { top: 'auto', bottom: `${-BAR}px`, right: '0px', left: 'auto' },
  right: { top: '4px', bottom: 'auto', right: 'auto', left: 'calc(100% + 6px)' },
  inside: { top: 'auto', bottom: '4px', right: '4px', left: 'auto' },
}

// A bar flush right with a block narrower than itself would stick out of
// the canvas on the left: it stands flush left with the block instead, as far
// from its edge as it stood from the right one, and if the block itself
// begins outside, where the canvas begins.
function keepInside(bar: HTMLElement, el: HTMLElement, placement: Placement): void {
  if (placement === 'right') return
  const limit = limitOf(el)
  if (bar.getBoundingClientRect().left >= limit.left) return
  const edge = parseFloat(STYLE[placement].right)
  bar.style.right = 'auto'
  bar.style.left = `${Math.max(edge, limit.left - el.getBoundingClientRect().left)}px`
}

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

export function SelectionBar({ block, def, host, onRemove }: SelectionBarProps) {
  const editor = useEditorInstance()
  const template = def?.templateKind ? firstDescendantOfType(editor.tree, block.id, def.templateKind.type) : undefined

  const barRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const placement = placementFor(host.current)
    Object.assign(el.style, STYLE[placement])
    if (host.current) keepInside(el, host.current, placement)
  }, [host, block])
  const kind = def?.childButton

  const kindName = kind === undefined
    ? ''
    : (kind.nameFromField !== undefined
      && fieldPlainName(
        String(block.values[kind.nameFromField] ?? ''),
        editor.dataSourceFor(block.id)?.id ?? '',
        editor.sourcesFor(block.id).map((q) => q.source),
      )) || kind.name
  const list = capability(def, 'list')?.binding
  const entryName = list?.defaultTitle.replace(/\s*\{n\}/, '') ?? 'Eintrag'
  const entries = list ? list.entries(block.values[list.prop]) : []
  const added = list?.entryAdd?.(entries) ?? null
  const removePossible = list?.entryRemove !== undefined && entries.length > 1

  return (
    <div
      ref={barRef}
      data-ff-editor-helper
      className="absolute z-20 flex items-center gap-0.5 rounded border border-line bg-panel p-0.5"
      style={STYLE.top}
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {canCompute(block) && (
        <Button className="h-6 px-1.5 text-dense"
          onClick={() => editor.openCalculations(block.id)}>
          <Link2 size={12} /> Berechnungen
        </Button>
      )}
      {template && def?.templateKind && (
        <Button className="h-6 px-1.5 text-dense" onClick={() => editor.selectBlock(template)}>
          {def.templateKind.name}
        </Button>
      )}
      {onRemove && (
        <Button onlyIcon className="h-6 w-6" title="Baustein löschen" aria-label="Baustein löschen"
          onClick={onRemove}><Trash2 size={12} /></Button>
      )}
      {kind && (
        <Button
          className="h-6 px-1.5 text-dense"
          onClick={() => editor.addBlock(kind.childType, block.id)}
        >
          <Plus size={12} /> {kindName}
        </Button>
      )}
      {list?.entryAdd !== undefined && (
        <Button
          className="h-6 px-1.5 text-dense"
          disabled={added === null}
          onClick={() => {
            if (added !== null) editor.updateProperty(block.id, list.prop, added)
          }}
        >
          <Plus size={12} /> {entryName}
        </Button>
      )}
      {list?.entryRemove !== undefined && (
        <Button
          className="h-6 px-1.5 text-dense"
          disabled={!removePossible}
          onClick={() => {
            const next = list.entryRemove?.(entries, entries.length - 1) ?? null
            if (next !== null) editor.updateProperty(block.id, list.prop, next)
          }}
        >
          <Minus size={12} /> {entryName}
        </Button>
      )}
    </div>
  )
}
