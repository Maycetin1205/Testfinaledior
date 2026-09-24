import { createElement, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { Component, Link2, Minus, Plus, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Popover } from '@/editor/widgets/Popover'
import { Separator } from '@/editor/widgets/Separator'
import type { BlockNode } from '../../core/block/tree'
import type { BlockType } from '../../core/block/blockType'
import { capability, type EventDef } from '../../core/block/capability'
import { propertyVisible } from '../../core/block/property'
import { propertiesFor } from '../../core/block/propertyPlace'
import {
  canCompute,
  carriesOwnSource,
  firstDescendantOfType,
  maySelectionFollows,
} from '../../core/block/treeQuery'
import { fieldPlainName } from '../../core/data/dataSources'
import { BLOCK_ICONS } from '../blockIcons'
import { ChainWindow } from '../datacenter/ChainWindow'
import { useEditor } from '../state/useEditor'
import { ActionsSection } from './ActionsSection'
import { BarControl } from './BarControl'
import { LookupWindowSection } from './LookupWindowSection'
import { followOffered } from './followOffer'
import { SelectionFollowSection } from './SelectionFollowSection'
import { SourceList } from './SourceList'

interface BlockBarProps {
  block: BlockNode
  def: BlockType | undefined

  host: RefObject<HTMLElement | null>

  onRemove?: () => void
}

type Placement = 'above' | 'below' | 'inside'

// Clear of the selection outline and the grips on the edge.
const GAP = 6

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

const STYLE: Record<Placement, CSSProperties> = {
  above: { top: 'auto', bottom: `calc(100% + ${GAP}px)`, left: '0px' },
  below: { top: `calc(100% + ${GAP}px)`, bottom: 'auto', left: '0px' },
  inside: { top: '4px', bottom: 'auto', left: '4px' },
}

// Directly above the top edge; a block at the very top gets it below. The bar
// starts flush left with the block and moves left only as far as it would
// stick out of the canvas on the right.
function place(bar: HTMLElement, el: HTMLElement): void {
  const limit = limitOf(el)
  bar.style.maxWidth = `${Math.max(0, limit.right - limit.left)}px`
  const r = el.getBoundingClientRect()
  const height = bar.getBoundingClientRect().height
  const placement: Placement = r.top - GAP - height >= limit.top
    ? 'above'
    : r.bottom + GAP + height <= limit.bottom ? 'below' : 'inside'
  Object.assign(bar.style, STYLE[placement])
  const b = bar.getBoundingClientRect()
  const over = b.right - limit.right
  if (over > 0) {
    const left = parseFloat(String(STYLE[placement].left))
    bar.style.left = `${left - Math.min(over, Math.max(0, b.left - limit.left))}px`
  }
}

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

// The small bar at the marked block: its sign and name, what the surface
// cannot show, and on the right the bin.
export function BlockBar({ block, def, host, onRemove }: BlockBarProps) {
  const ed = useEditor()
  const template = def?.templateKind ? firstDescendantOfType(ed.tree, block.id, def.templateKind.type) : undefined

  const [chainEvent, setChainEvent] = useState<EventDef | null>(null)

  const barRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const bar = barRef.current
    const el = host.current
    if (bar && el) place(bar, el)
  })

  const session = useMemo(() => ({
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }), [ed])

  const kind = def?.childButton
  const kindName = kind === undefined
    ? ''
    : (kind.nameFromField !== undefined
      && fieldPlainName(
        String(block.values[kind.nameFromField] ?? ''),
        ed.dataSourceFor(block.id)?.id ?? '',
        ed.sourcesFor(block.id).map((q) => q.source),
      )) || kind.name
  const list = capability(def, 'list')?.binding
  const entryName = list?.defaultTitle.replace(/\s*\{n\}/, '') ?? 'Eintrag'
  const entries = list ? list.entries(block.values[list.prop]) : []
  const added = list?.entryAdd?.(entries) ?? null
  const removePossible = list?.entryRemove !== undefined && entries.length > 1

  const sourceInReach = ed.dataSourceFor(block.id)
  const choices = def ? propertiesFor(block, def, 'bar') : []
  const searchWindow = capability(def, 'lookupWindow')?.window
  const events = capability(def, 'events')?.list ?? []

  return (
    <div
      ref={barRef}
      data-ff-editor-helper
      className="absolute z-20 flex w-max flex-wrap items-center gap-[6px] rounded border border-line bg-panel p-[2px] text-ui text-ink"
      style={STYLE.above}
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <span className="flex h-control items-center gap-[6px] pl-[6px] pr-[2px] font-semibold">
        {createElement(BLOCK_ICONS[block.type] ?? Component, { size: 14, className: 'text-muted' })}
        {def?.name ?? block.type}
      </span>

      {choices.length > 0 && <Separator vertical />}
      {choices.map(({ key, property }) => (
        <BarControl
          key={key}
          block={block}
          propertyKey={key}
          property={property}
          sourceInReach={sourceInReach}
          session={session}
        />
      ))}

      {carriesOwnSource(block) && (
        <BarWindow label="Quelle">
          {() => <SourceList block={block} />}
        </BarWindow>
      )}
      {searchWindow && propertyVisible(searchWindow.when, block.values) && (
        <BarWindow label="Suchfenster">
          {() => <LookupWindowSection block={block} window={searchWindow} />}
        </BarWindow>
      )}
      {maySelectionFollows(block) && followOffered(ed.tree, block) && (
        <BarWindow label="Folgt der Auswahl">
          {() => <SelectionFollowSection block={block} />}
        </BarWindow>
      )}
      {events.length > 0 && (
        <BarWindow label="Aktionen">
          {(close) => (
            <ActionsSection
              block={block}
              events={events}
              onOpen={(ev) => {
                close()
                setChainEvent(ev)
              }}
            />
          )}
        </BarWindow>
      )}

      {canCompute(block) && (
        <Button onClick={() => ed.openCalculations(block.id)}>
          <Link2 size={13} /> Berechnungen
        </Button>
      )}
      {template && def?.templateKind && (
        <Button onClick={() => ed.selectBlock(template)}>
          {def.templateKind.name}
        </Button>
      )}
      {kind && (
        <Button onClick={() => ed.addBlock(kind.childType, block.id)}>
          <Plus size={13} /> {kindName}
        </Button>
      )}
      {list?.entryAdd !== undefined && (
        <Button
          disabled={added === null}
          onClick={() => {
            if (added !== null) ed.updateProperty(block.id, list.prop, added)
          }}
        >
          <Plus size={13} /> {entryName}
        </Button>
      )}
      {list?.entryRemove !== undefined && (
        <Button
          disabled={!removePossible}
          onClick={() => {
            const next = list.entryRemove?.(entries, entries.length - 1) ?? null
            if (next !== null) ed.updateProperty(block.id, list.prop, next)
          }}
        >
          <Minus size={13} /> {entryName}
        </Button>
      )}

      {onRemove && (
        <>
          <Separator vertical />
          <Button onlyIcon title="Baustein löschen" aria-label="Baustein löschen" onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </>
      )}

      {chainEvent && (
        <ChainWindow
          block={block}
          eventKey={chainEvent.key}
          eventName={chainEvent.name}
          onClose={() => setChainEvent(null)}
        />
      )}
    </div>
  )
}

// A button in the bar that opens a small window beside it.
function BarWindow({ label, children }: {
  label: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button
        ref={button}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={open ? 'border-accent bg-accent-soft' : undefined}
        onClick={() => setOpen(!open)}
      >
        {label}
      </Button>
      {open && (
        <Popover name={label} anchor={button} width={340} maxHeight={480} onClose={() => setOpen(false)}>
          <div className="p-[6px]">{children(() => setOpen(false))}</div>
        </Popover>
      )}
    </>
  )
}
