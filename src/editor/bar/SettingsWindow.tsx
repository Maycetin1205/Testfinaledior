import { useState, type ReactNode } from 'react'
import type { EventDef, LookupWindow } from '../../core/block/capability'
import type { DeclaredProperty } from '../../core/block/propertyPlace'
import type { BlockNode } from '../../core/block/tree'
import { carriesOwnSource } from '../../core/block/treeQuery'
import type { SelectionFollow } from '../../core/data/selectionFollow'
import { ActionsSection } from '../actions/ActionsSection'
import { useEditor } from '../state/useEditor'
import { BarWindow } from './BarWindow'
import { followKey } from './followOffer'
import { LookupWindowSection } from './LookupWindowSection'
import { SelectionFollowSection } from './SelectionFollowSection'
import { SourceList } from './SourceList'

const SETTINGS_WIDTH = 380

// A group of the settings window, as a part of a card of the mask (.sub-hd):
// its name as bold text, a hairline above every group but the first, then its
// controls.
function Group({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col border-t border-line-soft first:border-t-0">
      <div className="flex h-[36px] items-center px-[12px] text-ui font-bold text-ink">
        {name}
      </div>
      {/* Each control on a line of its own, the ticks of switches side by side. */}
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] px-[12px] pb-[12px] [&>:not([data-switch])]:basis-full">{children}</div>
    </section>
  )
}

interface SettingsWindowProps {
  block: BlockNode

  // The controls of the given properties, as the bar draws them.
  controls: (props: DeclaredProperty[]) => ReactNode[]

  sourceProps: DeclaredProperty[]
  shows: DeclaredProperty[]
  lookupProps: DeclaredProperty[]

  // The block's search window, when it opens here and not per column.
  searchWindow: LookupWindow | undefined

  // The helper sources stand in a group of their own.
  helpersApart: boolean

  // What the block follows, when it follows and is not waiting for a click.
  follow: SelectionFollow | undefined

  events: readonly EventDef[]
}

// The window „Einstellungen" at the bar: what the surface cannot show, in
// groups. Nothing when the block has nothing to set.
export function SettingsWindow({
  block, controls, sourceProps, shows, lookupProps, searchWindow, helpersApart, follow, events,
}: SettingsWindowProps) {
  const ed = useEditor()
  // What the block followed when the bar came up: a different one means a
  // giver was just clicked.
  const [openedWith, setOpenedWith] = useState(() => (follow ? followKey(follow) : ''))

  const hasSource = carriesOwnSource(block) || sourceProps.length > 0
  const hasSearch = searchWindow !== undefined || lookupProps.length > 0
  const groups = [hasSource, helpersApart, shows.length > 0, hasSearch, follow !== undefined, events.length > 0]
  if (!groups.some(Boolean)) return null

  // A click on the giver changes what the block follows; the window then
  // opens anew and shows it.
  const followSeen = follow ? followKey(follow) : ''
  return (
    <BarWindow
      key={`settings:${followSeen}`}
      label="Einstellungen"
      width={SETTINGS_WIDTH}
      flush
      defaultOpen={followSeen !== '' && followSeen !== openedWith}
      onOpen={() => setOpenedWith(followSeen)}
    >
      {(close) => (
        <div className="flex flex-col">
          {hasSource && (
            <Group name="Quelle">
              {carriesOwnSource(block) && <SourceList block={block} part={helpersApart ? 'own' : 'all'} />}
              {controls(sourceProps)}
            </Group>
          )}
          {helpersApart && (
            <Group name="Hilfsquelle"><SourceList block={block} part="helpers" /></Group>
          )}
          {shows.length > 0 && <Group name="Anzeige">{controls(shows)}</Group>}
          {hasSearch && (
            <Group name="Suchfenster">
              {controls(lookupProps)}
              {searchWindow && <LookupWindowSection block={block} window={searchWindow} />}
            </Group>
          )}
          {follow && (
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
  )
}
