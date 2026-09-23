import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link2, Minus, Plus, SlidersHorizontal, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/PushButton'
import type { BlockNode } from '../../core/block/tree'
import { listRead, type BlockType } from '../../core/block/blockType'
import { capability } from '../../core/block/capability'
import { useEditorInstance } from '../state/EditorContext'
import { applyProps } from '../state/valuesPatch'
import { firstDescendantOfType, canCompute } from '../../core/block/treeQuery'
import { fieldPlainName } from '../../core/data/dataSources'
import { propertiesFor } from '../../core/block/propertyPlace'
import { Popover } from '@/editor/widgets/Popover'
import { PropControl } from '../inspector/PropControl'

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

function placementFor(el: HTMLElement | null): Placement {
  if (el === null) return 'inside'
  const r = el.getBoundingClientRect()
  const clip = clipParent(el)
  const limit = clip
    ? clip.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight, right: window.innerWidth }
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

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

export function SelectionBar({ block, def, host, onRemove }: SelectionBarProps) {
  const editor = useEditorInstance()
  const [style, setStyle] = useState(false)
  const anchor = useRef<HTMLButtonElement>(null)
  const session = useMemo(() => ({
    onBeginEditing: () => editor.beginTransaction(),
    onEndEditing: () => editor.endTransaction(),
  }), [editor])
  const properties = def ? propertiesFor(block, def, 'block') : []
  const template = def?.templateKind ? firstDescendantOfType(editor.tree, block.id, def.templateKind.type) : undefined

  const barRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = barRef.current
    if (el) Object.assign(el.style, STYLE[placementFor(host.current)])
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
  const next = list?.entryNeu
  const away = list?.entryAway
  const entryName = list?.standardTitle.replace(/\s*\{n\}/, '') ?? 'Eintrag'
  const neuPossible = next !== undefined && Object.keys(next(block.values)).length > 0
  const entries = list ? listRead(block.values[list.prop], list) : []
  const awayPossible = away !== undefined && entries.length > 1

  return (
    <div
      ref={barRef}
      data-ff-editor-helper
      className="absolute z-20 flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5 shadow-overlay"
      style={STYLE.top}
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {properties.length > 0 && (
        <Button ref={anchor} className="h-6 px-1.5 text-dense"
          aria-expanded={style} aria-haspopup="dialog"
          onClick={() => setStyle((open) => !open)}>
          <SlidersHorizontal size={12} /> Gestalten
        </Button>
      )}

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
      {style && (
        <Popover name={`${def?.name ?? 'Baustein'} gestalten`} anchor={anchor}
          width={280} maxHeight={420} onClose={() => setStyle(false)}>
          <div className="flex flex-col gap-3 p-2">
            <strong className="text-ui">{def?.name} gestalten</strong>
            {properties.map(({ key, property }) => (
              <PropControl key={key} block={block} propertyKey={key} property={property}
                sourceInReach={editor.dataSourceFor(block.id)} session={session} />
            ))}
          </div>
        </Popover>
      )}
      {kind && (
        <Button
          className="h-6 px-1.5 text-dense"
          onClick={() => editor.addBlock(kind.childType, block.id)}
        >
          <Plus size={12} /> {kindName}
        </Button>
      )}
      {next && (
        <Button
          className="h-6 px-1.5 text-dense"
          disabled={!neuPossible}
          onClick={() => applyProps(editor, block.id, next(block.values))}
        >
          <Plus size={12} /> {entryName}
        </Button>
      )}
      {away && (
        <Button
          className="h-6 px-1.5 text-dense"
          disabled={!awayPossible}
          onClick={() => {
            const index = entries.length - 1
            if (index >= 0) {
              applyProps(editor, block.id, away(block.values, index))
            }
          }}
        >
          <Minus size={12} /> {entryName}
        </Button>
      )}
    </div>
  )
}
