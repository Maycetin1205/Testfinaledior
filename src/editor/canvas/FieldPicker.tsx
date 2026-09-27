import type { RefObject } from 'react'
import { Popover } from '@/editor/widgets/Popover'
import { cn } from '@/editor/widgets/cn'
import { Badge } from '@/editor/widgets/Badge'
import { Button } from '@/editor/widgets/Button'
import { List, type ListGroup } from '@/editor/widgets/List'
import { MenuRow } from '@/editor/widgets/MenuRow'
import { Separator } from '@/editor/widgets/Separator'
import { bindingWithSource } from '../../core/block/blockType'
import type { DataField } from '../../core/data/dataSources'

export interface PickerGroup {
  sourceId: string

  name: string

  badge?: string
  fields: readonly DataField[]
}

export interface PickerField {
  key: string
  label: string

  current: string

  onlyForeignSources?: boolean
  onChoose: (value: string) => void
}

// A block without a source yet offers the sources of the library instead.
export interface SourcesChoice {
  entries: readonly { value: string; name: string; badge?: string }[]
  onChoose: (sourceId: string) => void

  onDataCenter?: () => void
}

interface FieldPickerProps {
  spotLabel: string
  groups: readonly PickerGroup[]

  sourcesChoice?: SourcesChoice

  current?: string

  onRemove?: () => void
  removeLabel?: string

  anchor?: RefObject<HTMLElement | null>

  level?: number

  top: number
  left: number

  onPick: (value: string) => void
  onClose: () => void
}

const NOT_BOUND = 'Nicht gebunden'

interface Display {
  name: string
  key?: string
  empty: boolean
  unknown: boolean
}

function displayOf(value: string, groups: readonly PickerGroup[]): Display {
  if (value === '') return { name: NOT_BOUND, empty: true, unknown: false }
  for (const g of groups) {
    for (const f of g.fields) {
      if (bindingWithSource(g.sourceId, f.code) !== value) continue
      return { name: f.name, key: f.code, empty: false, unknown: false }
    }
  }
  return { name: value, empty: false, unknown: true }
}

function listGroups(groups: readonly PickerGroup[]): ListGroup[] {
  return groups.map((g) => ({
    key: g.sourceId === '' ? '__erste__' : g.sourceId,
    name: g.name,
    badge: g.badge,
    entries: g.fields.map((f) => ({
      value: bindingWithSource(g.sourceId, f.code),
      name: f.name,
      badge: f.code,
    })),
  }))
}

interface FieldRowProps {
  label: string
  display: Display
}

function FieldRow({ label, display }: FieldRowProps) {
  return (
    <MenuRow
      active
      aria-pressed
      className="shrink-0 px-1.5"
    >

      <span className="w-24 shrink-0 truncate text-ui text-muted">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-ui',
          display.empty && 'text-muted',
          display.unknown ? 'text-error' : 'text-ink',
        )}
      >
        {display.name}
      </span>
      {display.key !== undefined && display.key !== '' && (
        <Badge className="max-w-[45%]">{display.key}</Badge>
      )}
    </MenuRow>
  )
}

export function FieldPicker({
  spotLabel,
  groups,
  sourcesChoice,
  current,
  anchor,
  level,
  top,
  left,
  onPick,
  onClose,
  onRemove,
  removeLabel,
}: FieldPickerProps) {
  const chosen = current ?? ''

  return (
    <Popover
      name={`Feld für ${spotLabel}`}
      at={{ top, left }}
      anchor={anchor}
      width={380}
      maxHeight={405}
      level={level}
      onClose={onClose}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <p className="shrink-0 truncate px-1.5 pt-0.5 text-label font-semibold uppercase tracking-label text-muted">
          {spotLabel}
        </p>

        {sourcesChoice ? (
          sourcesChoice.entries.length === 0 ? (
            <div className="flex shrink-0 flex-col gap-2 px-1.5 pb-1">
              {sourcesChoice.onDataCenter && (
                <Button kind="primary" className="self-start" onClick={sourcesChoice.onDataCenter}>
                  Daten öffnen
                </Button>
              )}
            </div>
          ) : (
            <>
              <Separator className="shrink-0" />
              <List
                fill
                searchable={sourcesChoice.entries.length > 8}
                groups={[{ key: 'sources', entries: sourcesChoice.entries }]}
                value=""
                onChoose={sourcesChoice.onChoose}
              />
            </>
          )
        ) : (
          <>

        <FieldRow label="Feld" display={displayOf(chosen, groups)} />

        <Separator className="shrink-0" />

        <p className="flex shrink-0 items-baseline gap-2 px-1.5 text-label font-semibold uppercase tracking-label text-muted">
          <span className="min-w-0 truncate">
            Feld wählen
          </span>
          {groups.length === 1 && (
            <span className="min-w-0 truncate normal-case tracking-normal">
              aus {groups[0].name}
            </span>
          )}
        </p>

        <List
          fill
          searchable
          groups={listGroups(
            groups.length === 1
              ? [{ ...groups[0], name: '' }]
              : groups,
          )}
          value={chosen}
          emptyText={NOT_BOUND}
          onChoose={onPick}
        />
          </>
        )}
        {onRemove !== undefined && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-1.5 pt-1.5">
            <Button kind="risk" onClick={onRemove}>{removeLabel ?? 'Entfernen'}</Button>
          </div>
        )}
      </div>
    </Popover>
  )
}
