import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { bindingFields, bindingJoiner, joinedBinding, toggledBinding } from '../../core/block/binding'
import { type ListBinding } from '../../core/block/blockType'
import type { SpotClick } from '../../blocks/base/BlockElement'
import { bindingProp, type BindableSpot, type LookupWindow } from '../../core/block/capability'
import { sourcesKey } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { FieldPicker } from './FieldPicker'
import { pickerGroups } from './fieldNames'
import { ListEntryBar, type ListPick } from './ListEntryBar'
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

  spotClickOf: (click: Event) => SpotClick | null

  onSelect?: () => void
}

// Binding a block's spots and list entries to fields by clicking them: the
// field picker at a spot, and the bar at the head of a list entry. The names
// of fields are fieldNames.tsx, the bar itself is ListEntryBar.tsx.
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
  spotClickOf,
  onSelect,
}: FieldBindingArgs): {
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  onDoubleClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  pickers: ReactNode

  // A column head is chosen: its bar stands in the place of the block's.
  columnOpen: boolean
  openEntry: number | null
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
    spotClickOf,
    onSelect,
  })

  const [listPicker, setListPicker] = useState<ListPick | null>(null)
  const closeListPicker = useCallback(() => setListPicker(null), [])
  if (!selected && listPicker !== null) setListPicker(null)

  const sourceFromProp = listBinding?.sourceProp === undefined
    ? undefined
    : library.find((s) => s.id === String(block.values[listBinding.sourceProp ?? ''] ?? ''))
  const listPickerHasFields = listBinding?.sourceProp !== undefined
    ? sourceFromProp !== undefined
    : hasOffer

  // The element reports a click on a list entry's head with where it is.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !listBinding) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        prop?: string
        index?: number
        inner?: number
        top?: number
        left?: number
      }

      if (detail?.prop !== listBinding.prop || typeof detail.index !== 'number') return
      const index = detail.index

      setListPicker({
        index,
        ...(typeof detail.inner === 'number' ? { inner: detail.inner } : {}),
        top: Math.max(8, detail.top ?? 0),
        left: Math.max(8, detail.left ?? 0),
      })
    }
    el.addEventListener('ff-list-bind', handler)
    return () => el.removeEventListener('ff-list-bind', handler)
  }, [containerRef, listBinding])

  const ownWindow = searchWindow?.entriesProp !== undefined
    && searchWindow.entriesProp === listBinding?.prop

  const groups = pickerGroups(sources)

  const sourcesChoice = !libraryOffer ? undefined : {
    entries: library.map((s) => ({ value: s.id, name: s.name, badge: sourcesKey(s) })),
    // The data window lies over the canvas; a picker left open would float above it.
    onData: () => {
      closePicker()
      closeListPicker()
      editor.showData(true)
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

  const pickers = (
    <>
      {selected && picker && hasOffer && (
        <FieldPicker
          spotLabel={picker.spot.name}
          groups={groups}
          current={bindingCode(block.values, picker.spot)}
          several={picker.spot.several ? {
            joiner: bindingJoiner(bindingCode(block.values, picker.spot)),
            onJoiner: (joiner) => editor.updateProperty(
              blockRef.current.id,
              bindingProp(picker.spot.prop),
              joinedBinding(bindingFields(bindingCode(blockRef.current.values, picker.spot)), joiner),
            ),
          } : undefined}
          top={picker.top}
          left={picker.left}
          sourcesChoice={sourcesChoice}
          onPick={(value) => {
            // A spot of several fields stays open: a pick adds or drops one.
            const several = picker.spot.several === true && value !== ''
            const binding = several ? toggledBinding(bindingCode(blockRef.current.values, picker.spot), value) : value
            editor.updateProperty(blockRef.current.id, bindingProp(picker.spot.prop), binding)
            if (!several) closePicker()
          }}
          onClose={closePicker}
        />
      )}
      {selected && listPicker && listBinding && (
        <ListEntryBar
          editor={editor}
          block={block}
          listBinding={listBinding}
          pick={listPicker}
          sources={sources}
          groups={groups}
          sourceFromProp={sourceFromProp}
          hasFields={listPickerHasFields}
          sourcesChoice={sourcesChoice}
          searchWindow={ownWindow ? searchWindow : undefined}
          element={element}
          onClose={closeListPicker}
        />
      )}
    </>
  )

  const columnOpen = selected === true && listPicker !== null
    && entriesOf()[listPicker.index] !== undefined

  // The entry of the list whose bar is open: a click on the block may place it.
  const openEntry = columnOpen && listPicker.inner === undefined ? listPicker.index : null

  return { onClick, onDoubleClick, pickers, columnOpen, openEntry }
}
