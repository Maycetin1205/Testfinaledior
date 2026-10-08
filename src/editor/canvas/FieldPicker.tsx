import type { RefObject } from 'react'
import { Popover } from '@/editor/widgets/Popover'
import { cn } from '@/editor/widgets/cn'
import { Badge } from '@/editor/widgets/Badge'
import { Button } from '@/editor/widgets/Button'
import { List, type ListGroup } from '@/editor/widgets/List'
import { MenuRow } from '@/editor/widgets/MenuRow'
import { Separator } from '@/editor/widgets/Separator'
import { Segment } from '@/editor/widgets/Segment'
import { BINDING_JOINERS, bindingFields, bindingJoiner, type BindingJoiner } from '../../core/block/binding'
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

  onData?: () => void
}

interface FieldPickerProps {
  spotLabel: string
  groups: readonly PickerGroup[]

  sourcesChoice?: SourcesChoice

  current?: string

  several?: SeveralFields

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
}

function fieldIn(value: string, groups: readonly PickerGroup[]): DataField | undefined {
  for (const g of groups) {
    const field = g.fields.find((f) => bindingWithSource(g.sourceId, f.code) === value)
    if (field) return field
  }
  return undefined
}

// The bound fields by name, a single one with its code; a field the sources
// in reach no longer have is left out.
function displayOf(value: string, groups: readonly PickerGroup[]): Display {
  if (value === '') return { name: NOT_BOUND, empty: true }
  const fields = bindingFields(value).flatMap((f) => fieldIn(f, groups) ?? [])
  const key = fields.length === 1 && bindingFields(value).length === 1 ? fields[0].code : undefined
  return { name: fields.map((f) => f.name).join(bindingJoiner(value)), key, empty: false }
}

// A spot that takes several fields: the list adds and drops them, the joiner
// stands between their values.
export interface SeveralFields {
  joiner: BindingJoiner
  onJoiner: (joiner: BindingJoiner) => void
}

const JOINER_OPTIONS = [
  { value: BINDING_JOINERS[0], name: '·' },
  { value: BINDING_JOINERS[1], name: 'Leerzeichen' },
]

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
        className={cn('min-w-0 flex-1 truncate text-ui', display.empty ? 'text-muted' : 'text-ink')}
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
  several,
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
        <p className="shrink-0 truncate px-1.5 pt-0.5 text-dense font-semibold text-muted">
          {spotLabel}
        </p>

        {sourcesChoice ? (
          sourcesChoice.entries.length === 0 ? (
            <div className="flex shrink-0 flex-col gap-2 px-1.5 pb-1">
              {sourcesChoice.onData && (
                <Button kind="primary" className="self-start" onClick={sourcesChoice.onData}>
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

        {several && bindingFields(chosen).length > 1 && (
          <div className="flex shrink-0 items-center gap-2 px-1.5">
            <span className="w-24 shrink-0 truncate text-ui text-muted">Trenner</span>
            <Segment
              name="Trenner"
              options={JOINER_OPTIONS}
              value={several.joiner}
              onChoose={(joiner) => several.onJoiner(bindingJoiner(joiner))}
            />
          </div>
        )}

        <Separator className="shrink-0" />

        <p className="flex shrink-0 items-baseline gap-2 px-1.5 text-dense font-semibold text-muted">
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
          values={several ? bindingFields(chosen) : undefined}
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
