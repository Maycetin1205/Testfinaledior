import { createElement, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ChevronDown, Component, Trash2, type Icon } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Separator } from '@/editor/widgets/Separator'
import { Tile } from '@/editor/widgets/Tile'
import { useCloseOnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { propertiesFor } from '../../core/block/propertyPlace'
import { BLOCK_ICONS } from '../blockIcons'
import { FieldPicker, type PickerField, type PickerGroup, type SourcesChoice } from '../canvas/FieldPicker'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { BarControl, Labeled } from './BarControl'
import { BarFrame, BarWindow } from './BlockBar'
import { controlShown } from './controlShown'

// One line holds seven parts at most; more, and the switches share a window.
const BAR_PARTS = 7

export interface ColumnSwitch {
  key: string
  label: string
  on: boolean
  onToggle: (on: boolean) => void
}

export interface ColumnAction {
  label: string
  icon: Icon
  onOpen: () => void
}

interface ColumnBarProps {
  block: BlockNode
  host: RefObject<HTMLElement | null>
  element: HTMLElement | null

  // The left edge of the column head.
  align: number

  name: string

  // The field of the column and every other field it takes, like the fill field.
  fields: readonly PickerField[]
  groups: readonly PickerGroup[]
  sourcesChoice?: SourcesChoice
  nameOf: (value: string) => string

  switches: readonly ColumnSwitch[]
  actions: readonly ColumnAction[]

  removeLabel: string
  onRemove?: () => void
  onClose: () => void
}

// The bar at a column head, in the place of the block's bar: the column's
// fields, its switches, what the list chooses at its heads, and the bin.
export function ColumnBar({
  block, host, element, align, name, fields, groups, sourcesChoice, nameOf,
  switches, actions, removeLabel, onRemove, onClose,
}: ColumnBarProps) {
  const ed = useEditor()
  const library = useDataSources().list
  const def = blockType(block.type)
  useCloseOnEscape(onClose)

  // A press beside the bar, its windows and the column heads closes it.
  useEffect(() => {
    const beside = (e: PointerEvent): void => {
      const inside = e.composedPath().some((t) => t instanceof HTMLElement
        && (t.getAttribute('role') === 'dialog' || t.dataset.ffEditorHelper !== undefined))
      if (!inside) onClose()
    }
    document.addEventListener('pointerdown', beside, true)
    return () => document.removeEventListener('pointerdown', beside, true)
  }, [onClose])

  const session = useMemo(() => ({
    onBeginEditing: () => ed.beginTransaction(),
    onEndEditing: () => ed.endTransaction(),
  }), [ed])
  const sourceInReach = ed.dataSourceFor(block.id)
  const choices = (def ? propertiesFor(block, def, 'column') : [])
    .filter(({ property }) => controlShown(property, block, sourceInReach, library))
  const parts = 1 + fields.length + switches.length + choices.length + actions.length + (onRemove ? 1 : 0)

  const shows = (
    <>
      {switches.map((s) => <Tile key={s.key} label={s.label} on={s.on} onToggle={s.onToggle} />)}
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
    </>
  )

  return (
    <BarFrame host={host} element={element} head={def?.head} align={align}>
      <span className="flex h-control items-center gap-[6px] pl-[6px] pr-[2px] font-semibold">
        {createElement(BLOCK_ICONS[block.type] ?? Component, { size: 14, className: 'text-muted' })}
        {name}
      </span>
      <Separator vertical />

      {fields.map((field) => (
        <FieldChoice
          key={field.key}
          field={field}
          groups={field.onlyForeignSources === true ? groups.filter((g) => g.sourceId !== '') : groups}
          sourcesChoice={sourcesChoice}
          nameOf={nameOf}
        />
      ))}
      {parts > BAR_PARTS
        ? (
            <BarWindow label="Anzeige">
              {() => <div className="flex flex-col items-start gap-[6px]">{shows}</div>}
            </BarWindow>
          )
        : shows}
      {actions.map((a) => (
        <Button key={a.label} onlyIcon aria-label={a.label} title={a.label} onClick={a.onOpen}>
          {createElement(a.icon, { size: 15 })}
        </Button>
      ))}

      {onRemove && (
        <>
          <Separator vertical />
          <Button onlyIcon title={removeLabel} aria-label={removeLabel} onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </>
      )}
    </BarFrame>
  )
}

// A field of the column: its name in the bar, the fields of the source below it.
function FieldChoice({ field, groups, sourcesChoice, nameOf }: {
  field: PickerField
  groups: readonly PickerGroup[]
  sourcesChoice?: SourcesChoice
  nameOf: (value: string) => string
}) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)

  return (
    <Labeled label={field.label}>
      <button
        ref={button}
        type="button"
        aria-label={field.label}
        aria-haspopup="dialog"
        aria-expanded={at !== null}
        onClick={() => {
          const r = button.current?.getBoundingClientRect()
          setAt(at !== null || !r ? null : { top: r.bottom + 4, left: r.left })
        }}
        className="flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[6px] transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {field.current !== '' && <span className="max-w-[160px] truncate">{nameOf(field.current)}</span>}
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {at !== null && (
        <FieldPicker
          spotLabel={field.label}
          groups={groups}
          sourcesChoice={sourcesChoice}
          current={field.current}
          anchor={button}
          top={at.top}
          left={at.left}
          onPick={(value) => {
            field.onChoose(value)
            setAt(null)
          }}
          onClose={() => setAt(null)}
        />
      )}
    </Labeled>
  )
}
