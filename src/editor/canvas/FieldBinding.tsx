import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { BlockNode } from '../../core/block/tree'
import {
  fieldChoicesRead,
  typedTitle,
  flagOn,
  flagFor,
  listStandardTitle,
  listRead,
  titleToFieldChoice,
  type ListBinding,
} from '../../core/block/blockType'
import { bindingProp, type BindableSpot, type LookupWindow } from '../../core/block/capability'
import { splitBinding } from '../../core/block/blockType'
import { canCompute } from '../../core/block/treeQuery'
import { sourcesKey } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import { applyProps } from '../state/valuesPatch'
import { sourcesCarrier } from '../../core/block/sourcesInReach'
import { useDataSources } from '../state/useDataSources'
import { widthFromIcon, iconOf } from './fieldWidth'
import { openLookupInEditor } from './lookupWindowState'
import { useInputSession } from '../inspector/controls/editSession'
import { openDataCenter } from '../datacenter/openDataCenter'
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
        key: sourcesKey(q.source),
        fields: q.source.fields,
      }
    : {
        sourceId: q.source.id,
        name: q.source.name,
        key: sourcesKey(q.source),
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
} {
  const library = useDataSources().list

  const typingSession = useInputSession(
    () => editor.beginTransaction(),
    () => editor.endTransaction(),
  )
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

      setListPicker((before) => (before !== null && before.index === index ? null : {
        index,
        top: Math.max(8, detail.top ?? 0),
        left: Math.max(8, Math.min(detail.left ?? 0, window.innerWidth - 248)),
      }))
    }
    el.addEventListener('ff-listen-bind', handler)
    return () => el.removeEventListener('ff-listen-bind', handler)
  }, [containerRef, listBinding])

  const ownWindow = searchWindow?.entriesProp !== undefined
    && searchWindow.entriesProp === listBinding?.prop

  const openWindow = (slot: number): void => {
    if (!element || searchWindow === undefined) return
    openLookupInEditor(editor, element, block.id, searchWindow, slot)
  }

  const groups = pickerGroups(sources)

  const sourcesChoice = !libraryOffer ? undefined : {
    entries: library.map((s) => ({ value: s.id, name: s.name, key: sourcesKey(s) })),
    onDataCenter: openDataCenter,
    onChoose: (sourceId: string) => {
      const carrier = sourcesCarrier(editor.tree, blockRef.current.id)
      if (sourceId === '' || !carrier) return
      editor.updateProperty(carrier.id, SOURCE_PROP, sourceId)
    },
  }

  const entriesOf = (): Record<string, unknown>[] => (
    listBinding ? listRead(block.values[listBinding.prop], listBinding) : []
  )

  const writeInEntry = (index: number, part: Record<string, unknown>): void => {
    if (!listBinding) return
    const next = entriesOf()
    const target = next[index]
    if (!target) return
    for (const [key, value] of Object.entries(part)) {
      if (value === undefined) delete target[key]
      else target[key] = value
    }
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
      {selected && listPicker && listBinding && listPickerHasFields && (() => {
        const list = entriesOf()
        const entry = list[listPicker.index]
        if (!entry) return null

        const perSource = sourceFromProp !== undefined
        const listGroups: PickerGroup[] = perSource
          ? [{
              sourceId: '',
              name: sourceFromProp.name,
              badge: sourcesKey(sourceFromProp),
              fields: sourceFromProp.fields,
            }]
          : groups
        const titleNow = String(entry[listBinding.titleKey] ?? '')
        const standardTitle = listStandardTitle(listBinding, listPicker.index)
        return (
          <FieldPicker

            key={listPicker.index}
            spotLabel={titleNow === '' ? standardTitle : titleNow}
            groups={listGroups}
            title={{
              value: titleNow,
              standard: standardTitle,
              onChange: (next) => {
                typingSession.begin()
                writeInEntry(listPicker.index, typedTitle(listBinding, next))
              },
              session: typingSession,
            }}
            extraFields={fieldChoicesRead(listBinding, entry).map(({ choice: fw, value }) => ({
              key: fw.key,
              label: fw.name,
              current: value,
              onlyForeignSources: fw.onlyForeignSources,
              onChoose: (next) => writeInEntry(
                listPicker.index,
                { [fw.key]: next === '' ? undefined : next },
              ),
            }))}
            flag={flagFor(listBinding, entry).map((s) => ({
              key: s.key,
              label: s.name,
              short: s.short,
              standard: s.standard,
              on: flagOn(s, entry),
              onToggle: (on) => writeInEntry(listPicker.index, { [s.key]: on }),
            }))}
            current={String(entry[listBinding.fieldKey] ?? '')}
            further={[
              ...(!ownWindow || searchWindow === undefined ? [] : [{
                label: 'Suchfenster…',
                onOpen: () => {
                  openWindow(listPicker.index)

                  setListPicker(null)
                },
              }]),
              ...(!canCompute(block) ? [] : [{
                label: 'Berechnung…',
                onOpen: () => {
                  editor.openCalculations(block.id)
                  setListPicker(null)
                },
              }]),
            ]}
            removeLabel={`${listBinding.standardTitle.replace(/\s*\{n\}/, '')} entfernen`}
            onRemove={listBinding.entryAway === undefined ? undefined : () => {
              const away = listBinding.entryAway
              if (!away) return
              if (!applyProps(editor, block.id, away(block.values, listPicker.index))) return
              setListPicker(null)
            }}
            sourcesChoice={perSource ? undefined : sourcesChoice}
            anchor={containerRef}
            top={listPicker.top}
            left={listPicker.left}
            onPick={(raw) => {
              editor.transaction(() => {
                const value = raw
                const next = entriesOf()
                const target = next[listPicker.index]
                if (!target) return

                const plainName = (fieldValue: string): string => (perSource
                  ? (sourceFromProp.fields.find((f) => f.code === fieldValue)?.name ?? '')
                  : plainNameOf(fieldValue, sources)) || fieldValue

                const icon = perSource
                  ? sourceFromProp.fields.find((f) => f.code === value)?.icon
                  : iconOf(value, sources)
                const width = widthFromIcon(icon)

                const title = titleToFieldChoice(
                  target,
                  value === '' ? standardTitle : plainName(value),
                )
                if (title !== undefined) target[listBinding.titleKey] = title
                target[listBinding.fieldKey] = value
                if (width !== undefined) target.width = width
                editor.updateProperty(block.id, listBinding.prop, next)
              })

            }}
            onClose={closeListPicker}
          />
        )
      })()}
    </>
  )

  return { onClick, onDoubleClick, pickers }
}
