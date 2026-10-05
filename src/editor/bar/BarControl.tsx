import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import type { Property } from '../../core/block/property'
import { fieldOf, fieldPlainName, sourcesKey, type DataSource } from '../../core/data/dataSources'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import type { ListGroup } from '@/editor/widgets/List'
import { Choice } from '@/editor/widgets/Choice'
import { Field } from '@/editor/widgets/Field'
import { NumberControl } from '../controls/NumberControl'
import { PickerControl } from '../controls/PickerControl'
import { SegmentControl } from '../controls/SegmentControl'
import { useInputSession } from '../controls/useInputSession'
import { controlShown, fieldSourceOf } from './controlShown'
import { Labeled, Switch } from './Labeled'
import { SwatchChoice } from './SwatchChoice'

interface EditCallbacks {
  onBeginEditing: () => void
  onEndEditing: () => void
}

// An entry of the block's list, like a column of a board, that a control
// reads and writes in place of the block.
export interface EntryAccess {
  values: Readonly<Record<string, unknown>>
  set: (key: string, value: unknown) => void
}

interface BarControlProps {
  block: BlockNode
  propertyKey: string
  property: Property<unknown>

  sourceInReach: DataSource | undefined
  session: EditCallbacks

  // With an entry the control belongs to the entry, and the block is its parent.
  entry?: EntryAccess
}

interface PickerCase {
  denominator: string
  groups: ListGroup[]
  value: string
  emptyText: string
  onChoose: (value: string) => void
}

// One declared property as a control in the bar at the block: the kind of
// the property picks the control. The name in front of it is Labeled, the
// colors are SwatchChoice, the type of a text is FontChoice.
export function BarControl({
  block,
  propertyKey,
  property,
  sourceInReach,
  session,
  entry,
}: BarControlProps) {
  const ed = useEditor()

  const sources = useDataSources()

  const value = entry ? entry.values[propertyKey] : block.values[propertyKey]
  const kind = property.type.control
  const set = (v: unknown) => (entry ? entry.set(propertyKey, v) : ed.updateProperty(block.id, propertyKey, v))

  const fieldSource = fieldSourceOf(property, block, sourceInReach, sources.list)

  const parent = property.nameFromParentField === undefined
    ? undefined
    : entry ? block : block.parentId ? ed.getNode(block.parentId) : undefined
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
            if (newId !== String(value ?? '')) set(newId)
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
                const plainName = fieldOf(fieldSource, code)?.name ?? ''
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
      return <Switch label={property.label} on={value === true} onToggle={set} />
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
        <Labeled label={property.label}>
          <SegmentControl
            name={property.label}
            options={options}
            value={String(value ?? '')}
            onChange={set}
          />
        </Labeled>
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
