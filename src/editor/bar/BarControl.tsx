import { useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import type { ChoiceOption, Property } from '../../core/block/property'
import type { DeclaredProperty } from '../../core/block/propertyPlace'
import { fieldPlainName, sourcesKey, type DataSource } from '../../core/data/dataSources'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import type { ListGroup } from '@/editor/widgets/List'
import { Choice } from '@/editor/widgets/Choice'
import { ColorSwatch } from '@/editor/widgets/ColorSwatch'
import { Field } from '@/editor/widgets/Field'
import { Popover } from '@/editor/widgets/Popover'
import { Segment } from '@/editor/widgets/Segment'
import { Tile } from '@/editor/widgets/Tile'
import { NumberControl } from '../controls/NumberControl'
import { PickerControl } from '../controls/PickerControl'
import { SegmentControl } from '../controls/SegmentControl'
import { useInputSession } from '../controls/useInputSession'
import { controlShown, fieldSourceOf } from './controlShown'

interface EditCallbacks {
  onBeginEditing: () => void
  onEndEditing: () => void
}

interface BarControlProps {
  block: BlockNode
  propertyKey: string
  property: Property<unknown>

  sourceInReach: DataSource | undefined
  session: EditCallbacks
}

interface PickerCase {
  denominator: string
  groups: ListGroup[]
  value: string
  emptyText: string
  onChoose: (value: string) => void
}

// The name in front of a control, as .vfeld-label writes it, and what it
// refers to, like the field a Kanban column sorts by.
export function Labeled({ label, detail = '', children }: {
  label: string
  detail?: string
  children: ReactNode
}) {
  return (
    <span className="flex min-w-0 items-center gap-[6px]">
      <span className="shrink-0 text-label font-semibold uppercase tracking-label text-muted">
        {label}
      </span>
      {detail !== '' && <span className="shrink-0 font-semibold text-ink">{detail}</span>}
      {children}
    </span>
  )
}

// One declared property as a control in the bar at the block.
export function BarControl({
  block,
  propertyKey,
  property,
  sourceInReach,
  session,
}: BarControlProps) {
  const ed = useEditor()

  const sources = useDataSources()
  const def = blockType(block.type)

  const value = block.values[propertyKey]
  const kind = property.type.control
  const set = (v: unknown) => ed.updateProperty(block.id, propertyKey, v)

  const fieldSource = fieldSourceOf(property, block, sourceInReach, sources.list)

  const parent = property.nameFromParentField !== undefined && block.parentId
    ? ed.getNode(block.parentId)
    : undefined
  const parentField = parent && property.nameFromParentField !== undefined
    ? fieldPlainName(
      String(parent.values[property.nameFromParentField] ?? ''),
      ed.dataSourceFor(parent.id)?.id ?? '',
      ed.sourcesFor(parent.id).map((q) => q.source),
    )
    : ''

  if (!controlShown(property, block, sourceInReach, sources.list)) return null

  const pickerCase = (): PickerCase | undefined => {
    switch (kind) {
      case 'source':
        return {
          denominator: 'Quelle',
          groups: [{
            key: 'sources',
            entries: sources.list.map((q) => ({
              value: q.id,
              name: q.name,
              badge: sourcesKey(q),
            })),
          }],
          value: typeof value === 'string' ? value : '',
          emptyText: 'Keine',
          onChoose: (newId) => {
            if (newId === String(value ?? '')) return

            ed.transaction(() => {
              set(newId)

              for (const [otherKey, other] of Object.entries(def?.properties ?? {})) {
                if (other.sourceProp !== propertyKey) continue
                ed.updateProperty(block.id, otherKey, '')
                if (other.plainNameProp) {
                  ed.updateProperty(block.id, other.plainNameProp, '')
                }
              }

              const list = capability(def, 'list')?.binding
              const oldList = list ? block.values[list.prop] : undefined
              if (list?.sourceProp === propertyKey
                && Array.isArray(oldList) && oldList.length > 0) {
                ed.updateProperty(block.id, list.prop, [])
              }
            })
          },
        }

      case 'field':
        return {
          denominator: 'Feld',
          groups: [{
            key: 'fields',
            name: fieldSource?.name,
            badge: fieldSource ? sourcesKey(fieldSource) : undefined,
            entries: (fieldSource?.fields ?? []).map((f) => ({
              value: f.code,
              name: f.name,
              badge: f.code,
            })),
          }],
          value: value == null ? '' : String(value),
          emptyText: 'Nicht gebunden',
          onChoose: (code) => {
            ed.transaction(() => {
              set(code)

              if (property.plainNameProp) {
                const plainName = fieldSource?.fields.find((f) => f.code === code)?.name ?? ''
                ed.updateProperty(block.id, property.plainNameProp, plainName)
              }
            })
          },
        }

      default:
        return undefined
    }
  }

  const fall = pickerCase()
  if (fall) {
    const { denominator, ...rest } = fall
    return (
      <Labeled label={property.label}>
        <PickerControl
          name={`${denominator} für ${property.label}`}
          className="w-36"
          {...rest}
        />
      </Labeled>
    )
  }

  const options = property.type.options ?? []

  switch (kind) {
    case 'boolean':
      return <Tile label={property.label} on={value === true} onToggle={set} />
    case 'text': {
      // A value that belongs to a field of the parent (the column's value for
      // the board's sorting field) reads as "STATUS =", and while the parent
      // has no field yet, the parent's field control stands in its place.
      if (parent && property.nameFromParentField !== undefined) {
        const code = String(parent.values[property.nameFromParentField] ?? '')
        if (code === '') {
          const parentProperty = blockType(parent.type)?.properties[property.nameFromParentField]
          return parentProperty
            ? (
                <BarControl
                  block={parent}
                  propertyKey={property.nameFromParentField}
                  property={parentProperty}
                  sourceInReach={ed.dataSourceFor(parent.id)}
                  session={session}
                />
              )
            : null
        }
        return (
          <Labeled label={`${parentField !== '' ? parentField : code} =`}>
            <BarText property={property} value={String(value ?? '')} onChange={set} {...session} />
          </Labeled>
        )
      }
      return (
        <Labeled label={property.label}>
          <BarText property={property} value={String(value ?? '')} onChange={set} {...session} />
        </Labeled>
      )
    }
    case 'number':
      return (
        <Labeled label={property.label}>
          <NumberControl property={property} value={value} onChange={set} {...session} />
        </Labeled>
      )
    case 'segment':
      return (
        <SegmentControl
          name={property.label}
          options={options}
          value={String(value ?? '')}
          onChange={set}
        />
      )
    case 'choice':
      return options.length > 0 && options.every((o) => o.color !== undefined)
        ? <SwatchChoice label={property.label} options={options} value={String(value ?? '')} onChange={set} />
        : (
            <Labeled label={property.label}>
              <Choice
                aria-label={property.label}
                className="w-auto"
                options={options}
                value={String(value ?? '')}
                onChoose={set}
              />
            </Labeled>
          )
    default:
      return null
  }
}

function BarText({
  property,
  value,
  onChange,
  onBeginEditing,
  onEndEditing,
}: {
  property: Property<unknown>
  value: string
  onChange: (value: string) => void
} & EditCallbacks) {
  const session = useInputSession(onBeginEditing, onEndEditing)
  return (
    <Field
      aria-label={property.label}
      value={value}
      maxLength={property.maxLength || undefined}
      className="w-28"
      onChange={(e) => {
        session.begin()
        onChange(e.currentTarget.value)
      }}
      onBlur={session.finish}
    />
  )
}

const SWATCH_STEP = 30

// A choice of colors: the chosen one in the bar, all of them in a small window.
function SwatchChoice({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly ChoiceOption[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const chosen = options.find((o) => o.value === value) ?? options[0]

  return (
    <Labeled label={label}>
      <button
        ref={button}
        type="button"
        aria-label={`${label}: ${chosen?.name ?? ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[6px] transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <span
          className="h-[14px] w-[14px] rounded border border-line"
          style={{ backgroundColor: chosen?.color }}
        />
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {open && (
        <Popover
          name={label}
          anchor={button}
          width={options.length * SWATCH_STEP + 14}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-wrap gap-[6px] p-[2px]">
            {options.map((o) => (
              <ColorSwatch
                key={o.value}
                color={o.color}
                name={o.name}
                chosen={o.value === value}
                onChoose={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </Popover>
      )}
    </Labeled>
  )
}

const FONT_WIDTH = 264

// Color and size of the type as one button in the bar: it shows both, its
// small window offers both. While the role presets a value, the button shows
// the role's, and choosing that one leaves it to the role again.
export function FontChoice({ block, fonts }: { block: BlockNode; fonts: readonly DeclaredProperty[] }) {
  const ed = useEditor()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const name = fonts.map((f) => f.property.label).join(' und ')

  const presetOf = (property: Property<unknown>): string => {
    const preset = property.preset
    return preset ? preset.values[String(block.values[preset.by] ?? '')] ?? '' : ''
  }
  const shownOf = (d: DeclaredProperty): string => {
    const held = String(block.values[d.key] ?? '')
    return held !== '' ? held : presetOf(d.property)
  }
  const choose = (d: DeclaredProperty, value: string) => {
    ed.updateProperty(block.id, d.key, value === presetOf(d.property) ? d.property.default : value)
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={name}
        title={name}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[6px] transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {fonts.map((d) => {
          const option = d.property.type.options?.find((o) => o.value === shownOf(d))
          return option?.color !== undefined
            ? <span key={d.key} className="h-[14px] w-[14px] rounded border border-line" style={{ backgroundColor: option.color }} />
            : <span key={d.key} className="tabular-nums">{option?.name ?? ''}</span>
        })}
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {open && (
        <Popover name={name} anchor={button} width={FONT_WIDTH} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-[8px] p-[6px]">
            {fonts.map((d) => {
              const options = d.property.type.options ?? []
              const shown = shownOf(d)
              return (
                <div key={d.key} className="flex flex-col gap-[4px]">
                  <span className="text-label font-semibold uppercase tracking-label text-muted">
                    {d.property.label}
                  </span>
                  {options.every((o) => o.color !== undefined)
                    ? (
                        <span className="flex gap-[6px]">
                          {options.map((o) => (
                            <ColorSwatch
                              key={o.value}
                              color={o.color}
                              name={o.name}
                              chosen={o.value === shown}
                              onChoose={() => choose(d, o.value)}
                            />
                          ))}
                        </span>
                      )
                    : <Segment name={d.property.label} options={options} value={shown} onChoose={(v) => choose(d, v)} />}
                </div>
              )
            })}
          </div>
        </Popover>
      )}
    </>
  )
}
