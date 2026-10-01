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
import { Component, FileText, Link2, Trash2, type Icon } from '@/editor/icons/icon'
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
  maySelectionFollows,
  SOURCE_PROP,
} from '../../core/block/treeQuery'
import { SELECTION_FOLLOW_PROP } from '../../core/data/selectionFollow'
import { BLOCK_ICONS } from '../blockIcons'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { ActionsSection } from '../actions/ActionsSection'
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

// Always flush with the block's left edge, or with its column: above the top
// edge, where no other block and no edge is in the way; else, for a low block,
// below it; else inside on the block's own top edge, below the column heads of
// a table. Never at the far end of the block.
function spotFor(bar: HTMLElement, el: HTMLElement, depth: number, align?: number): { top: number; left: number } {
  const room = roomOf(el)
  bar.style.maxWidth = `${Math.max(0, room.right - room.left)}px`
  const w = bar.offsetWidth
  const h = bar.offsetHeight
  const r = el.getBoundingClientRect()
  const others = otherBlocks(el)
  const left = Math.max(room.left, Math.min(align ?? r.left, room.right - w))
  const free = (top: number) => {
    const box = { top, bottom: top + h, left, right: left + w }
    return box.top >= room.top && box.bottom <= room.bottom && !others.some((o) => overlaps(box, o))
  }
  const above = r.top - GAP - h
  if (free(above)) return { top: above, left }
  // Below a tall block the bar would stand far from where one works.
  const below = r.bottom + GAP
  if (align === undefined && r.height <= 3 * h && free(below)) return { top: below, left }
  return { top: r.top + depth, left }
}

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

const SETTINGS_WIDTH = 380

// A group of the settings window: its name on a strip with a line above and
// below, then its controls.
function Group({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <div className="flex h-[28px] items-center border-y border-line bg-control px-[10px] text-dense font-semibold text-muted">
        {name}
      </div>
      <div className="flex flex-col gap-[6px] px-[10px] py-[8px]">{children}</div>
    </section>
  )
}

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

  const session = useMemo(() => ({
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }), [ed])

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
  // What the block followed when the bar came up: a different one means a
  // giver was just clicked.
  const [openedWith, setOpenedWith] = useState(() => {
    const f = followOf(block)
    return f ? followKey(f) : ''
  })

  return (
    <BarFrame host={host} element={element} head={def?.head}>
      <BarSign type={block.type} name={def?.name ?? block.type} />

      {(choices.length > 0 || fonts.length > 0) && <Separator vertical />}
      {withFonts(controls(choices), choices, fonts, block)}

      {(() => {
        const follows = maySelectionFollows(block) && followOffered(ed.tree, block, library)
        const follow = follows ? followOf(block) : undefined
        const hasSource = carriesOwnSource(block) || sourceProps.length > 0
        const hasHelpers = helpersApart && String(block.values[SOURCE_PROP] ?? '') !== ''
        const hasSearch = windowShown || lookupProps.length > 0
        const hasFollow = follow !== undefined && ed.followPickFor !== block.id
        const groups = [hasSource, hasHelpers, shows.length > 0, hasSearch, hasFollow, events.length > 0]
        // A click on the giver changes what the block follows; the window
        // then opens anew and shows it.
        const followSeen = hasFollow ? followKey(follow) : ''
        return (
          <>
            {groups.some(Boolean) && (
              <BarWindow
                key={`settings:${followSeen}`}
                label="Einstellungen"
                width={SETTINGS_WIDTH}
                flush
                defaultOpen={followSeen !== '' && followSeen !== openedWith}
                onOpen={() => setOpenedWith(followSeen)}
              >
                {(close) => (
                  <div className="-m-1 flex flex-col">
                    {hasSource && (
                      <Group name="Quelle">
                        {carriesOwnSource(block) && <SourceList block={block} part={helpersApart ? 'own' : 'all'} />}
                        {controls(sourceProps)}
                      </Group>
                    )}
                    {hasHelpers && (
                      <Group name="Hilfsquelle"><SourceList block={block} part="helpers" /></Group>
                    )}
                    {shows.length > 0 && <Group name="Anzeige">{controls(shows)}</Group>}
                    {hasSearch && (
                      <Group name="Suchfenster">
                        {controls(lookupProps)}
                        {windowShown && <LookupWindowSection block={block} window={searchWindow} />}
                      </Group>
                    )}
                    {hasFollow && (
                      <Group name="Folgt der Auswahl">
                        <SelectionFollowSection
                          block={block}
                          onPick={() => {
                            close()
                            ed.pickFollowFor(block.id)
                          }}
                        />
                      </Group>
                    )}
                    {events.length > 0 && (
                      <Group name="Aktionen"><ActionsSection block={block} events={events} /></Group>
                    )}
                  </div>
                )}
              </BarWindow>
            )}
            {follows && (follow === undefined || ed.followPickFor === block.id) && <FollowPick block={block} />}
          </>
        )
      })()}

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
export function BarWindow({ label, icon, width = 340, defaultOpen = false, flush = false, onOpen, children }: {
  label: string
  icon?: Icon
  width?: number
  defaultOpen?: boolean
  // The content reaches the window's edges, as strips with lines do.
  flush?: boolean
  onOpen?: () => void
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { if (open) onOpen?.() }, [open, onOpen])
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
            <div className={flush ? undefined : "p-[6px]"}>{children(() => setOpen(false))}</div>
          </LabelsShown.Provider>
        </Popover>
      )}
    </>
  )
}
