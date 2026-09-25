import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { BlockNode } from '../../core/block/tree'
import {
  fieldChoicesRead,
  flagOn,
  flagFor,
  listDefaultTitle,
  type ListBinding,
} from '../../core/block/blockType'
import { bindingProp, type BindableSpot, type LookupWindow } from '../../core/block/capability'
import { splitBinding } from '../../core/block/blockType'
import { canCompute } from '../../core/block/treeQuery'
import { sourcesKey } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { widthFromLength, lengthOf } from './fieldWidth'
import { openLookupInEditor } from './lookupWindowState'
import { openDataCenter } from '../datacenter/openDataCenter'
import { Calculator, Search } from '@/editor/icons/icon'
import { ColumnBar } from '../bar/ColumnBar'
import { FieldPicker, type PickerGroup } from './FieldPicker'
import { bindingCode, useBindingPicker } from './useBindingPicker'

interface FieldBindingArgs {
  editor: EditorStore
  blockRef: RefObject<BlockNode>
  block: BlockNode
  selected: boolean | undefined
  bindableSpots: readonly BindableSpot[]
  listBinding: ListBinding | undefined

  searchWindow: LookupWindow | undefined

  sources: readonly SourceInReach[]

  containerRef: RefObject<HTMLDivElement | null>

  element: HTMLElement | null

  onSelect?: () => void
}

function pickerGroups(sources: readonly SourceInReach[]): PickerGroup[] {
  return sources.map((q, i) => (i === 0
    ? {
        sourceId: '',
        name: q.source.name,
        badge: sourcesKey(q.source),
        fields: q.source.fields,
      }
    : {
        sourceId: q.source.id,
        name: q.source.name,
        badge: sourcesKey(q.source),
        fields: q.source.fields,
      }))
}

function plainNameOf(value: string, sources: readonly SourceInReach[]): string {
  const { sourceId, code } = splitBinding(value)
  const source = sourceId === ''
    ? sources[0]?.source
    : sources.find((q) => q.source.id === sourceId)?.source
  return source?.fields.find((f) => f.code === code)?.name ?? ''
}

export function useFieldBinding({
  editor,
  blockRef,
  block,
  selected,
  bindableSpots,
  listBinding,
  searchWindow,
  sources,
  containerRef,
  element,
  onSelect,
}: FieldBindingArgs): {
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  onDoubleClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  pickers: ReactNode

  // A column head is chosen: its bar stands in the place of the block's.
  columnOpen: boolean
} {
  const library = useDataSources().list

  const hasSource = sources.length > 0

  const libraryOffer = !hasSource && sourcesCarrier(editor.tree, block.id) !== undefined
  const hasOffer = hasSource || libraryOffer

  const { picker, closePicker, onClick, onDoubleClick } = useBindingPicker({
    editor,
    blockRef,
    selected,
    bindableSpots,
    hasOffer,
    onSelect,
  })

  const [listPicker, setListPicker] = useState<{
    index: number
    top: number
    left: number
  } | null>(null)
  const closeListPicker = useCallback(() => setListPicker(null), [])
  if (!selected && listPicker !== null) setListPicker(null)

  const sourceFromProp = listBinding?.sourceProp === undefined
    ? undefined
    : library.find((s) => s.id === String(block.values[listBinding.sourceProp ?? ''] ?? ''))
  const listPickerHasFields = listBinding?.sourceProp !== undefined
    ? sourceFromProp !== undefined
    : hasOffer

  useEffect(() => {
    const el = containerRef.current
    if (!el || !listBinding) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        prop?: string
        index?: number
        top?: number
        left?: number
      }

      if (detail?.prop !== listBinding.prop || typeof detail.index !== 'number') return
      const index = detail.index

      setListPicker({
        index,
        top: Math.max(8, detail.top ?? 0),
        left: Math.max(8, detail.left ?? 0),
      })
    }
    el.addEventListener('ff-list-bind', handler)
    return () => el.removeEventListener('ff-list-bind', handler)
  }, [containerRef, listBinding])

  const ownWindow = searchWindow?.entriesProp !== undefined
    && searchWindow.entriesProp === listBinding?.prop

  const openWindow = (slot: number): void => {
    if (!element || searchWindow === undefined) return
    openLookupInEditor(editor, element, block.id, searchWindow, slot)
  }

  const groups = pickerGroups(sources)

  const sourcesChoice = !libraryOffer ? undefined : {
    entries: library.map((s) => ({ value: s.id, name: s.name, badge: sourcesKey(s) })),
    // The data center covers the canvas; a picker left open would float above it.
    onDataCenter: () => {
      closePicker()
      closeListPicker()
      openDataCenter()
    },
    onChoose: (sourceId: string) => {
      const carrier = sourcesCarrier(editor.tree, blockRef.current.id)
      if (sourceId === '' || !carrier) return
      editor.updateProperty(carrier.id, SOURCE_PROP, sourceId)
    },
  }

  const entriesOf = (): unknown[] => (
    listBinding ? listBinding.entries(block.values[listBinding.prop]) : []
  )

  const writeInEntry = (index: number, change: (entry: unknown) => unknown): void => {
    if (!listBinding) return
    const next = entriesOf()
    const target = next[index]
    if (target === undefined) return
    next[index] = change(target)
    editor.updateProperty(block.id, listBinding.prop, next)
  }

  const pickers = (
    <>
      {selected && picker && hasOffer && (
        <FieldPicker
          spotLabel={picker.spot.name}
          groups={groups}
          current={bindingCode(block.values, picker.spot)}
          top={picker.top}
          left={picker.left}
          sourcesChoice={sourcesChoice}
          onPick={(value) => {
            editor.updateProperty(blockRef.current.id, bindingProp(picker.spot.prop), value)
            closePicker()
          }}
          onClose={closePicker}
        />
      )}
      {selected && listPicker && listBinding && (() => {
        const list = entriesOf()
        const entry = list[listPicker.index]
        if (entry === undefined) return null

        const perSource = sourceFromProp !== undefined
        const listGroups: PickerGroup[] = perSource
          ? [{
              sourceId: '',
              name: sourceFromProp.name,
              badge: sourcesKey(sourceFromProp),
              fields: sourceFromProp.fields,
            }]
          : groups
        const titleNow = listBinding.titleOf(entry)
        const defaultTitle = listDefaultTitle(listBinding, listPicker.index)
        const plainName = (fieldValue: string): string => (perSource
          ? (sourceFromProp.fields.find((f) => f.code === fieldValue)?.name ?? '')
          : plainNameOf(fieldValue, sources)) || fieldValue

        const pickField = (value: string): void => {
          editor.transaction(() => {
            const next = entriesOf()
            const target = next[listPicker.index]
            if (target === undefined) return
            const length = perSource
              ? sourceFromProp.fields.find((f) => f.code === value)?.length
              : lengthOf(value, sources)
            next[listPicker.index] = listBinding.withPickedField(
              target,
              value,
              value === '' ? defaultTitle : plainName(value),
              widthFromLength(length),
            )
            editor.updateProperty(block.id, listBinding.prop, next)
          })
        }

        return (
          <ColumnBar
            key={listPicker.index}
            block={block}
            host={containerRef}
            element={element}
            align={listPicker.left}
            name={titleNow === '' ? defaultTitle : titleNow}
            fields={!listPickerHasFields ? [] : [
              { key: 'field', label: 'Feld', current: listBinding.fieldOf(entry), onChoose: pickField },
              ...fieldChoicesRead(listBinding, entry).map(({ choice, value }) => ({
                key: choice.key,
                label: choice.name,
                current: value,
                onlyForeignSources: choice.onlyForeignSources,
                onChoose: (next: string) => writeInEntry(listPicker.index, (e) => choice.withValue(e, next)),
              })),
            ]}
            groups={listGroups}
            sourcesChoice={perSource ? undefined : sourcesChoice}
            nameOf={plainName}
            switches={flagFor(listBinding, entry).map((s) => ({
              key: s.key,
              label: s.short ?? s.name,
              on: flagOn(s, entry),
              onToggle: (on) => writeInEntry(listPicker.index, (e) => s.withValue(e, on)),
            }))}
            actions={[
              ...(!ownWindow || searchWindow === undefined ? [] : [{
                label: 'Suchfenster',
                icon: Search,
                onOpen: () => {
                  openWindow(listPicker.index)
                  setListPicker(null)
                },
              }]),
              ...(!canCompute(block) ? [] : [{
                label: 'Berechnung',
                icon: Calculator,
                onOpen: () => {
                  editor.openCalculations(block.id)
                  setListPicker(null)
                },
              }]),
            ]}
            removeLabel={`${listBinding.defaultTitle.replace(/\s*\{n\}/, '')} entfernen`}
            onRemove={listBinding.entryRemove === undefined ? undefined : () => {
              const next = listBinding.entryRemove?.(entriesOf(), listPicker.index) ?? null
              if (next === null) return
              editor.updateProperty(block.id, listBinding.prop, next)
              setListPicker(null)
            }}
            onClose={closeListPicker}
          />
        )
      })()}
    </>
  )

  const columnOpen = selected === true && listPicker !== null
    && entriesOf()[listPicker.index] !== undefined

  return { onClick, onDoubleClick, pickers, columnOpen }
}
