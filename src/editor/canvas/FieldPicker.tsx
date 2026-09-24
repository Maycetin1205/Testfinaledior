import { useEffect, useState, type RefObject } from 'react'
import { Popover } from '@/editor/widgets/Popover'
import { cn } from '@/editor/widgets/cn'
import { Badge } from '@/editor/widgets/Badge'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { List, type ListGroup } from '@/editor/widgets/List'
import { MenuRow } from '@/editor/widgets/MenuRow'
import { Switch } from '@/editor/widgets/Switch'
import { Separator } from '@/editor/widgets/Separator'
import { bindingWithSource } from '../../core/block/blockType'
import type { DataField } from '../../core/data/dataSources'
import type { EditSession } from '../controls/useInputSession'

export interface PickerGroup {
  sourceId: string

  name: string

  badge?: string
  fields: readonly DataField[]
}

interface PickerTitle {
  value: string

  fallback: string
  onChange: (title: string) => void

  session: EditSession
}

interface PickerFlag {
  key: string
  label: string

  short?: string
  onByDefault?: boolean
  on: boolean
  onToggle: (on: boolean) => void
}

interface PickerField {
  key: string
  label: string

  current: string

  onlyForeignSources?: boolean
  onChoose: (value: string) => void
}

interface FieldPickerProps {
  spotLabel: string
  groups: readonly PickerGroup[]

  title?: PickerTitle

  flag?: readonly PickerFlag[]

  extraFields?: readonly PickerField[]

  sourcesChoice?: {
    entries: readonly { value: string; name: string; badge?: string }[]
    onChoose: (sourceId: string) => void

    onDataCenter?: () => void
  }

  current?: string

  onRemove?: () => void
  removeLabel?: string

  moreActions?: readonly {
    label: string
    onOpen: () => void
  }[]

  anchor?: RefObject<HTMLElement | null>

  level?: number

  top: number
  left: number

  onPick: (value: string) => void
  onClose: () => void
}

const MAIN_FIELD = ''

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
  active: boolean
  onActive: () => void
}

function FieldRow({ label, display, active, onActive }: FieldRowProps) {
  return (
    <MenuRow
      active={active}
      aria-pressed={active}
      onClick={onActive}
      className="px-1.5"
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
  title,
  flag,
  extraFields,
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
  moreActions,
}: FieldPickerProps) {
  const titleSession = title?.session
  useEffect(() => () => {
    titleSession?.finish()
  }, [titleSession])

  const [targetKey, setTargetKey] = useState(MAIN_FIELD)

  const extraTargets = extraFields ?? []

  const targets: readonly PickerField[] = [
    {
      key: MAIN_FIELD,
      label: 'Feld',
      current: current ?? '',
      onChoose: onPick,
    },
    ...extraTargets,
  ]
  const active = targets.find((z) => z.key === targetKey) ?? targets[0]

  const visibleGroups = active.onlyForeignSources === true
    ? groups.filter((g) => g.sourceId !== '')
    : groups

  const hasFlags = (flag?.length ?? 0) > 0

  const fieldRow = (target: PickerField) => (
    <FieldRow
      key={target.key}
      label={target.label}
      display={displayOf(target.current, groups)}
      active={target.key === active.key}
      onActive={() => setTargetKey(target.key)}
    />
  )

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
      <div className="flex flex-col gap-1.5">
        <p className="truncate px-1.5 pt-0.5 text-label font-semibold uppercase tracking-label text-muted">
          {spotLabel}
        </p>

        {sourcesChoice ? (
          sourcesChoice.entries.length === 0 ? (
            <div className="flex flex-col gap-2 px-1.5 pb-1">
              {sourcesChoice.onDataCenter && (
                <Button kind="primary" className="self-start" onClick={sourcesChoice.onDataCenter}>
                  Daten öffnen
                </Button>
              )}
            </div>
          ) : (
            <>
              <Separator />
              <List
                searchable={sourcesChoice.entries.length > 8}
                groups={[{ key: 'sources', entries: sourcesChoice.entries }]}
                value=""
                onChoose={sourcesChoice.onChoose}
              />
            </>
          )
        ) : (
          <>

        {title && (
          <Field
            value={title.value}
            placeholder={title.fallback}
            aria-label="Spaltenname"
            onChange={(e) => {
              title.session.begin()
              title.onChange(e.currentTarget.value)
            }}
            onBlur={() => {
              title.session.finish()
              if (title.value.trim() === '') title.onChange(title.fallback)
            }}
            className="font-medium"
          />
        )}

        {fieldRow(targets[0])}

        {extraTargets.map(fieldRow)}

        {hasFlags && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1.5">
            {(flag ?? []).map((s) => (
              <Switch
                key={s.key}
                on={s.on}
                label={s.short ?? s.label}
                onToggle={s.onToggle}
              />
            ))}
          </div>
        )}

        <Separator />

        <p className="flex items-baseline gap-2 px-1.5 text-label font-semibold uppercase tracking-label text-muted">
          <span className="min-w-0 truncate">
            {active.label} wählen
          </span>
          {visibleGroups.length === 1 && (
            <span className="min-w-0 truncate normal-case tracking-normal">
              aus {visibleGroups[0].name}
            </span>
          )}
        </p>

        <List
          key={`liste:${active.key}`}
          searchable
          groups={listGroups(
            visibleGroups.length === 1
              ? [{ ...visibleGroups[0], name: '' }]
              : visibleGroups,
          )}
          value={active.current}
          emptyText={NOT_BOUND}
          onChoose={active.onChoose}
        />
          </>
        )}
        {((moreActions?.length ?? 0) > 0 || onRemove !== undefined) && (
          <div className="sticky bottom-0 -mb-1 flex items-center justify-between gap-2 border-t border-line bg-panel px-1.5 py-1.5">
            <div className="flex items-center gap-1.5">
              {(moreActions ?? []).map((w) => (
                <Button key={w.label} onClick={w.onOpen}>{w.label}</Button>
              ))}
            </div>
            {onRemove !== undefined && (
              <Button kind="risk" onClick={onRemove}>{removeLabel ?? 'Entfernen'}</Button>
            )}
          </div>
        )}
      </div>
    </Popover>
  )
}
