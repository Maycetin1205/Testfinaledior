import {
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Component, FileText, Link2, Plus, Search, Trash2, Zap, type Icon } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Popover } from '@/editor/widgets/Popover'
import { Separator } from '@/editor/widgets/Separator'
import type { BlockNode } from '../../core/block/tree'
import type { BlockType } from '../../core/block/blockType'
import { capability } from '../../core/block/capability'
import { propertyVisible, type PropertyPlace } from '../../core/block/property'
import { propertiesFor, type DeclaredProperty } from '../../core/block/propertyPlace'
import {
  carriesOwnSource,
  firstDescendantOfType,
  maySelectionFollows,
  SOURCE_PROP,
} from '../../core/block/treeQuery'
import { fieldPlainName } from '../../core/data/dataSources'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { BLOCK_ICONS } from '../blockIcons'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { ActionsSection } from './ActionsSection'
import { BarControl, FontChoice } from './BarControl'
import { controlShown } from './controlShown'
import { followKey, followOf, followOffered, followOnDocument } from './followOffer'
import { openDocumentOf } from '../controls/outsideOrigin'
import { useView } from '../state/useView'
import { useCloseOnEscape } from '@/editor/widgets/useCloseOnEscape'
import { LookupWindowSection } from './LookupWindowSection'
import { SelectionFollowSection } from './SelectionFollowSection'
import { SourceList } from './SourceList'
import { LabelsShown } from './labelsShown'

interface BlockBarProps {
  block: BlockNode
  def: BlockType | undefined

  host: RefObject<HTMLElement | null>
  element: HTMLElement | null

  onRemove?: () => void
}

interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

// Clear of the selection outline and the grips on the edge.
const GAP = 4

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

// The room of the bar: the canvas, and above it the grey up to the edge, so a
// block in the first row keeps its bar above as well.
function roomOf(el: HTMLElement): Box {
  const canvas = el.closest('[data-ff-canvas]')
  if (!canvas) return { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth }
  const c = canvas.getBoundingClientRect()
  const main = el.closest('main')
  return { top: main ? main.getBoundingClientRect().top : c.top, bottom: c.bottom, left: c.left, right: c.right }
}

// Every other block: not the block itself, not what holds it, not what it holds.
function otherBlocks(el: HTMLElement): Box[] {
  return [...document.querySelectorAll<HTMLElement>('[data-block-id]')]
    .filter((b) => b !== el && !b.contains(el) && !el.contains(b))
    .map((b) => b.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
}

// How far below the top edge the head of the block ends, like a table's row
// of column heads.
function headDepth(el: HTMLElement, element: HTMLElement | null, head: string | undefined): number {
  const part = head ? element?.shadowRoot?.querySelector(head) : null
  return part ? Math.max(0, part.getBoundingClientRect().bottom - el.getBoundingClientRect().top) : 0
}

// Above the top edge, where no other block and no edge is in the way; else
// inside on the block's own top edge, below the column heads of a table. Flush
// with the given left edge, like a column's, else flush left, else flush right,
// whichever touches no other block.
function spotFor(bar: HTMLElement, el: HTMLElement, depth: number, align?: number): { top: number; left: number } {
  const room = roomOf(el)
  bar.style.maxWidth = `${Math.max(0, room.right - room.left)}px`
  const w = bar.offsetWidth
  const h = bar.offsetHeight
  const r = el.getBoundingClientRect()
  const others = otherBlocks(el)
  const inRoom = (left: number) => Math.max(room.left, Math.min(left, room.right - w))
  const lefts = [...(align === undefined ? [] : [inRoom(align)]), inRoom(r.left), inRoom(r.right - w)]
  const free = (top: number, left: number) => {
    const box = { top, bottom: top + h, left, right: left + w }
    return box.top >= room.top && box.bottom <= room.bottom && !others.some((o) => overlaps(box, o))
  }
  const above = r.top - GAP - h
  const aboveLeft = lefts.find((left) => free(above, left))
  if (aboveLeft !== undefined) return { top: above, left: aboveLeft }
  const inside = r.top + depth
  return { top: inside, left: lefts.find((left) => free(inside, left)) ?? lefts[0] }
}

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

// The sentences of the actions want room for a relation and its values.
const ACTIONS_WIDTH = 520

interface BarFrameProps {
  host: RefObject<HTMLElement | null>
  element: HTMLElement | null
  head?: string

  // The left edge the bar would rather start at, like a column's.
  align?: number
  children: ReactNode
}

// The frame of a bar at a block: one line, placed anew after every change and
// whenever the canvas scrolls or the block changes its size.
export function BarFrame({ host, element, head, align, children }: BarFrameProps) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const placeRef = useRef(() => {})
  useLayoutEffect(() => {
    placeRef.current = () => {
      const bar = barRef.current
      const el = host.current
      if (!bar || !el) return
      const spot = spotFor(bar, el, headDepth(el, element, head), align)
      bar.style.top = `${spot.top}px`
      bar.style.left = `${spot.left}px`
    }
    placeRef.current()
  })
  useEffect(() => {
    const place = () => placeRef.current()
    const el = host.current
    const watch = new ResizeObserver(place)
    if (el) watch.observe(el)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      watch.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [host])

  return createPortal(
    <div
      ref={barRef}
      data-ff-editor-helper
      className="fixed z-20 flex w-max items-center gap-[4px] overflow-hidden whitespace-nowrap rounded border border-line bg-panel p-px text-ui text-ink"
      style={{ top: -9999, left: -9999 }}
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <LabelsShown.Provider value={false}>{children}</LabelsShown.Provider>
    </div>,
    document.body,
  )
}

// The block or column the bar belongs to, as its sign alone; the name is for
// a screen reader.
export function BarSign({ type, name }: { type: string; name: string }) {
  return (
    <span role="img" aria-label={name} className="flex h-control items-center px-[6px]">
      {createElement(BLOCK_ICONS[type] ?? Component, { size: 14, className: 'text-muted', 'aria-hidden': true })}
    </span>
  )
}

// Color and size stand right behind the choice that presets them, like the
// role of a text; without one, behind all choices.
function withFonts(
  shown: ReactNode[],
  choices: DeclaredProperty[],
  fonts: DeclaredProperty[],
  block: BlockNode,
): ReactNode[] {
  if (fonts.length === 0) return shown
  const by = fonts.find((f) => f.property.preset)?.property.preset?.by
  const after = choices.findIndex((c) => c.key === by)
  const at = after < 0 ? shown.length : after + 1
  return [...shown.slice(0, at), <FontChoice key="fonts" block={block} fonts={fonts} />, ...shown.slice(at)]
}

// The small bar at the marked block: its sign and name, what the surface
// cannot show, and on the right the bin. One line.
export function BlockBar({ block, def, host, element, onRemove }: BlockBarProps) {
  const ed = useEditor()
  const library = useDataSources().list
  const template = def?.templateKind ? firstDescendantOfType(ed.tree, block.id, def.templateKind.type) : undefined

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

  const sourceInReach = ed.dataSourceFor(block.id)
  const at = (where: PropertyPlace): DeclaredProperty[] => (def ? propertiesFor(block, def, where) : [])
    .filter(({ property }) => controlShown(property, block, sourceInReach, library))
  const controls = (props: DeclaredProperty[]) => props.map(({ key, property }) => (
    <BarControl
      key={key}
      block={block}
      propertyKey={key}
      property={property}
      sourceInReach={sourceInReach}
      session={session}
    />
  ))

  const choices = at('bar')
  const fonts = at('font')
  const shows = at('display')
  const sourceProps = at('source')
  const lookupProps = at('lookup')
  const searchWindow = capability(def, 'lookupWindow')?.window
  // A window per column opens at the column head, not here.
  const windowShown = searchWindow !== undefined && searchWindow.entriesProp === undefined
    && propertyVisible(searchWindow.when, block.values)
  const events = capability(def, 'events')?.list ?? []
  const helpersApart = capability(def, 'source')?.helpersApart === true && carriesOwnSource(block)

  return (
    <BarFrame host={host} element={element} head={def?.head}>
      <BarSign type={block.type} name={def?.name ?? block.type} />

      {(choices.length > 0 || fonts.length > 0) && <Separator vertical />}
      {withFonts(controls(choices), choices, fonts, block)}

      {shows.length > 0 && (
        <BarWindow label="Anzeige">
          {() => <div className="flex flex-col items-start gap-[6px]">{controls(shows)}</div>}
        </BarWindow>
      )}
      {(carriesOwnSource(block) || sourceProps.length > 0) && (
        <BarWindow label="Quelle">
          {() => (
            <div className="flex flex-col gap-[8px]">
              {carriesOwnSource(block) && <SourceList block={block} part={helpersApart ? 'own' : 'all'} />}
              {controls(sourceProps)}
            </div>
          )}
        </BarWindow>
      )}
      {helpersApart && String(block.values[SOURCE_PROP] ?? '') !== '' && (
        <BarWindow label="Hilfsquelle">
          {() => <SourceList block={block} part="helpers" />}
        </BarWindow>
      )}
      {(windowShown || lookupProps.length > 0) && (
        <BarWindow label="Suchfenster" icon={Search}>
          {() => (
            <div className="flex flex-col gap-[8px]">
              {controls(lookupProps)}
              {windowShown && <LookupWindowSection block={block} window={searchWindow} />}
            </div>
          )}
        </BarWindow>
      )}
      {maySelectionFollows(block) && followOffered(ed.tree, block, library) && (() => {
        const follow = followOf(block)
        if (follow === undefined || ed.followPickFor === block.id) return <FollowPick block={block} />
        const open = follow.pairs.some((p) => p.fromField === '' || p.toField === '')
        return (
          <BarWindow key={`follow:${followKey(follow)}`} label="Folgt der Auswahl" icon={Link2} defaultOpen={open}>
            {(close) => (
              <SelectionFollowSection
                block={block}
                onPick={() => {
                  close()
                  ed.pickFollowFor(block.id)
                }}
              />
            )}
          </BarWindow>
        )
      })()}
      {events.length > 0 && (
        <BarWindow label="Aktionen" icon={Zap} width={ACTIONS_WIDTH}>
          {() => <ActionsSection block={block} events={events} />}
        </BarWindow>
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

      {onRemove && (
        <>
          <Separator vertical />
          <Button onlyIcon title="Baustein löschen" aria-label="Baustein löschen" onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </>
      )}

    </BarFrame>
  )
}

// Waits for a click on what this block follows: a block with a chosen row or
// a form field on the canvas, or the open document beside the sign. Escape or
// a click on the canvas ends the waiting.
function FollowPick({ block }: { block: BlockNode }) {
  const ed = useView()
  const openDocument = openDocumentOf(useDataSources().list)
  const waiting = ed.followPickFor === block.id
  return (
    <>
      <Button
        onlyIcon
        aria-label="Folgt der Auswahl"
        title="Folgt der Auswahl"
        aria-pressed={waiting}
        className={waiting ? 'border-accent bg-accent-soft text-ink' : undefined}
        onClick={() => ed.pickFollowFor(waiting ? null : block.id)}
      >
        <Link2 size={15} />
      </Button>
      {waiting && openDocument && (
        <Button
          onlyIcon
          aria-label={openDocument.name}
          title={openDocument.name}
          onClick={() => {
            ed.updateProperty(block.id, SELECTION_FOLLOW_PROP, followOnDocument(block, openDocument.id))
            ed.pickFollowFor(null)
          }}
        >
          <FileText size={15} />
        </Button>
      )}
      {waiting && <EscapeEnds onEscape={() => ed.pickFollowFor(null)} />}
    </>
  )
}

function EscapeEnds({ onEscape }: { onEscape: () => void }) {
  useCloseOnEscape(onEscape)
  return null
}

// A button in the bar that opens a small window beside it; with a sign, the
// sign alone stands in the bar.
export function BarWindow({ label, icon, width = 340, defaultOpen = false, children }: {
  label: string
  icon?: Icon
  width?: number
  defaultOpen?: boolean
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const button = useRef<HTMLButtonElement>(null)
  const pressed = open ? 'border-accent bg-accent-soft text-ink' : undefined
  return (
    <>
      {icon
        ? (
            <Button
              ref={button}
              onlyIcon
              aria-label={label}
              title={label}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={pressed}
              onClick={() => setOpen(!open)}
            >
              {createElement(icon, { size: 15 })}
            </Button>
          )
        : (
            <Button
              ref={button}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={pressed}
              onClick={() => setOpen(!open)}
            >
              {label}
            </Button>
          )}
      {open && (
        <Popover name={label} anchor={button} width={width} maxHeight={480} onClose={() => setOpen(false)}>
          <LabelsShown.Provider value>
            <div className="p-[6px]">{children(() => setOpen(false))}</div>
          </LabelsShown.Provider>
        </Popover>
      )}
    </>
  )
}
