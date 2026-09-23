import type { BlockNode } from '../../core/block/tree'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import type { Property } from '../../core/block/property'
import { sourcesKey, type DataSource } from '../../core/data/dataSources'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import type { ListGroup } from '@/editor/widgets/List'
import { TileControl } from './controls/TileControl'
import { ColorTileControl } from './controls/ColorTileControl'
import { NumberControl } from './controls/NumberControl'
import { PickerControl } from './controls/PickerControl'
import { SegmentControl } from './controls/SegmentControl'
import { SelectControl } from './controls/SelectControl'
import { TextControl } from './controls/TextControl'

export interface EditCallbacks {
  onBeginEditing: () => void
  onEndEditing: () => void
}

export interface PropControlProps {
  block: BlockNode
  propertyKey: string
  property: Property<unknown>

  sourceInReach: DataSource | undefined
  session: EditCallbacks

  compact?: boolean
}

interface PickerCase {
  denominator: string
  groups: ListGroup[]
  value: string
  emptyText: string
  onChoose: (value: string) => void
}

export function PropControl({
  block,
  propertyKey,
  property,
  sourceInReach,
  session,
  compact = false,
}: PropControlProps) {
  const ed = useEditor()

  const sources = useDataSources()
  const def = blockType(block.type)

  const value = block.values[propertyKey]
  const kind = property.type.control
  const set = (v: unknown) => ed.updateProperty(block.id, propertyKey, v)

  const fieldSource = property.sourceProp
    ? sources.get(String(block.values[property.sourceProp] ?? ''))
    : sourceInReach

  if (compact) {
    if (kind === 'number') {
      return <NumberControl property={property} value={value} onChange={set} {...session} />
    }
    if (kind === 'segment') {
      return (
        <SegmentControl
          name={property.label}
          options={property.type.options ?? []}
          value={String(value ?? '')}
          onChange={set}
        />
      )
    }
  }

  if (property.needsSource && !sourceInReach) return null
  if (kind === 'field' && !fieldSource) return null

  if (kind === 'boolean') {
    return <TileControl property={property} value={value} onChange={set} />
  }

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
      <PickerControl
        label={property.label}
        name={`${denominator} für ${property.label}`}
        {...rest}
      />
    )
  }

  switch (kind) {
    case 'text':
      return <TextControl property={property} value={String(value ?? '')} onChange={set} {...session} />

    case 'number':
      return <NumberControl label={property.label} property={property} value={value} onChange={set} {...session} />
    case 'segment':
      return (
        <SegmentControl
          label={property.label}
          name={property.label}
          options={property.type.options ?? []}
          value={String(value ?? '')}
          onChange={set}
        />
      )
    case 'choice': {
      const opts = property.type.options ?? []
      const shared = {
        label: property.label,
        options: opts,
        value: String(value ?? ''),
        onChange: set,
      }

      return opts.length > 0 && opts.every((o) => o.color !== undefined)
        ? <ColorTileControl {...shared} />
        : <SelectControl {...shared} />
    }
    default:
      return null
  }
}
