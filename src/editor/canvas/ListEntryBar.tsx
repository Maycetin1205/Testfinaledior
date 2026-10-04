import type { RefObject } from 'react'
import { Calculator, ListPlus, Search } from '@/editor/icons/icon'
import {
  entriesWithValue,
  entryValues,
  fieldChoicesRead,
  flagOn,
  flagFor,
  innerOf,
  listDefaultTitle,
  withInner,
  type ListBinding,
} from '../../core/block/blockType'
import { capability, type LookupWindow } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import type { BlockNode } from '../../core/block/tree'
import { fieldOf, sourcesKey, type DataSource } from '../../core/data/dataSources'
import type { SourceInReach } from '../../core/data/extraSources'
import { CalculationWindow } from '../bar/CalculationWindow'
import { ColumnBar } from '../bar/ColumnBar'
import type { EditorStore } from '../state/EditorStore'
import type { PickerGroup, SourcesChoice } from './FieldPicker'
import { plainNameOf, sourceNameOf } from './fieldNames'
import { lengthOf, widthFromLength } from './fieldWidth'
import { openLookupInEditor } from './lookupWindowState'

// Which entry of the block's list has its head chosen, and where its bar
// aligns; an inner entry, like a place of a board's column, by its index.
export interface ListPick {
  index: number
  inner?: number
  top: number
  left: number
}

interface ListEntryBarProps {
  editor: EditorStore
  block: BlockNode
  listBinding: ListBinding
  pick: ListPick

  sources: readonly SourceInReach[]
  groups: PickerGroup[]

  // The source the list's entries read, when the list names one itself.
  sourceFromProp: DataSource | undefined
  hasFields: boolean
  sourcesChoice: SourcesChoice | undefined

  // The block's lookup window, when it belongs to this list's entries.
  searchWindow: LookupWindow | undefined

  containerRef: RefObject<HTMLDivElement | null>
  element: HTMLElement | null

  onClose: () => void
}

// The bar at the head of a list entry, like a column: its field, its
// switches and actions, the bin. An inner entry gets a bar of its own.
export function ListEntryBar({
  editor, block, listBinding, pick, sources, groups, sourceFromProp, hasFields, sourcesChoice,
  searchWindow, containerRef, element, onClose,
}: ListEntryBarProps) {
  const entriesOf = (): unknown[] => listBinding.entries(block.values[listBinding.prop])

  const list = entriesOf()
  const entry = list[pick.index]
  if (entry === undefined) return null
  const innerBinding = listBinding.inner?.binding
  const innerList = innerOf(listBinding, entry)

  const writeInEntry = (change: (entry: unknown) => unknown): void => {
    const next = entriesOf()
    const target = next[pick.index]
    if (target === undefined) return
    next[pick.index] = change(target)
    editor.updateProperty(block.id, listBinding.prop, next)
  }

  // The inner list of the entry, changed and written back through the entry.
  const writeInner = (change: (inner: readonly unknown[]) => readonly unknown[] | null): boolean => {
    const entries = entriesOf()
    const next = change(innerOf(listBinding, entries[pick.index]))
    if (next === null) return false
    return editor.updateProperty(block.id, listBinding.prop, withInner(listBinding, entries, pick.index, next))
  }

  // The declared values of an inner entry, as the bar at its head reads them.
  const innerGroup = (at: number, inner: ListBinding, own: unknown) => ({
    properties: Object.entries(inner.entryProperties ?? {}),
    access: {
      values: entryValues(inner, own),
      set: (key: string, value: unknown) => {
        writeInner((list) => entriesWithValue(inner, list, at, key, value))
      },
    },
  })

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
  const defaultTitle = listDefaultTitle(listBinding, pick.index)
  const plainName = (fieldValue: string): string => (perSource
    ? (fieldOf(sourceFromProp, fieldValue)?.name ?? '')
    : plainNameOf(fieldValue, sources)) || fieldValue
  // In the bar the field carries its source: two columns named alike
  // tell apart by where they read.
  const sourceName = (fieldValue: string): string => (perSource
    ? sourceFromProp.name
    : sourceNameOf(fieldValue, sources))
  const nameWithSource = (fieldValue: string): string => {
    const source = sourceName(fieldValue)
    return source === '' ? plainName(fieldValue) : `${source}: ${plainName(fieldValue)}`
  }

  const pickField = (value: string): void => {
    editor.transaction(() => {
      const next = entriesOf()
      const target = next[pick.index]
      if (target === undefined) return
      const length = perSource
        ? fieldOf(sourceFromProp, value)?.length
        : lengthOf(value, sources)
      next[pick.index] = listBinding.withPickedField(
        target,
        value,
        value === '' ? defaultTitle : plainName(value),
        widthFromLength(length),
      )
      editor.updateProperty(block.id, listBinding.prop, next)
    })
  }

  // The head of an inner entry, like a place of a board's column: its own
  // values and the bin; its name is typed on the head.
  const at = pick.inner
  if (at !== undefined) {
    const own = innerList[at]
    if (own === undefined || !innerBinding) return null
    const title = innerBinding.titleOf(own)
    return (
      <ColumnBar
        key={`${pick.index}.${at}`}
        block={block}
        host={containerRef}
        element={element}
        align={pick.left}
        name={title === '' ? listDefaultTitle(innerBinding, at) : title}
        fields={[]}
        groups={groups}
        nameOf={(value) => value}
        entries={[innerGroup(at, innerBinding, own)]}
        switches={[]}
        actions={[]}
        removeLabel={`${innerBinding.defaultTitle.replace(/\s*\{n\}/, '')} entfernen`}
        onRemove={innerBinding.entryRemove === undefined ? undefined : () => {
          if (writeInner((inner) => innerBinding.entryRemove?.(inner, at) ?? null)) onClose()
        }}
        onClose={onClose}
      />
    )
  }

  // An entry with a single inner entry is that entry as well: the bar at
  // its head shows the inner values first, like the value of a column
  // that has one place.
  const innerAdd = innerBinding?.entryAdd
  const computeProp = capability(blockType(block.type), 'compute')?.prop
  const column = listBinding.keyOf?.(entry) ?? ''
  return (
    <ColumnBar
      key={pick.index}
      block={block}
      host={containerRef}
      element={element}
      align={pick.left}
      name={titleNow === '' ? defaultTitle : titleNow}
      fields={!hasFields || listBinding.fieldless === true ? [] : [
        { key: 'field', label: 'Feld', current: listBinding.fieldOf(entry), onChoose: pickField },
        ...fieldChoicesRead(listBinding, entry).map(({ choice, value }) => ({
          key: choice.key,
          label: choice.name,
          current: value,
          onlyForeignSources: choice.onlyForeignSources,
          onChoose: (next: string) => writeInEntry((e) => choice.withValue(e, next)),
        })),
      ]}
      groups={listGroups}
      sourcesChoice={perSource ? undefined : sourcesChoice}
      nameOf={nameWithSource}
      entries={[
        ...(innerBinding && innerList.length === 1
          ? [innerGroup(0, innerBinding, innerList[0])]
          : []),
        ...(listBinding.entryProperties === undefined ? [] : [{
          properties: Object.entries(listBinding.entryProperties),
          access: {
            values: entryValues(listBinding, entry),
            set: (key: string, value: unknown) => editor.updateProperty(
              block.id,
              listBinding.prop,
              entriesWithValue(listBinding, entriesOf(), pick.index, key, value),
            ),
          },
        }]),
      ]}
      switches={flagFor(listBinding, entry).map((s) => ({
        key: s.key,
        label: s.short ?? s.name,
        on: flagOn(s, entry),
        onToggle: (on) => writeInEntry((e) => s.withValue(e, on)),
      }))}
      places={(listBinding.entryPlace ?? []).filter((p) => p.shown(entry)).map((p) => ({
        key: p.key,
        label: p.name,
        value: p.valueOf(entriesOf(), pick.index),
        entries: p.options(entriesOf(), pick.index),
        onChoose: (value) => writeInEntry((e) => p.withValue(e, value)),
      }))}
      actions={[
        ...(!innerBinding || innerAdd === undefined ? [] : [{
          label: `${innerBinding.defaultTitle.replace(/\s*\{n\}/, '')} anfügen`,
          icon: ListPlus,
          onOpen: () => { writeInner((inner) => innerAdd(inner)) },
        }]),
        ...(searchWindow === undefined ? [] : [{
          label: 'Nachschlagen',
          icon: Search,
          onOpen: () => {
            if (element) openLookupInEditor(editor, element, block.id, searchWindow, pick.index)
            onClose()
          },
        }]),
      ]}
      windows={computeProp === undefined || column === '' ? [] : [{
        label: 'Berechnung',
        icon: Calculator,
        width: 460,
        render: () => (
          <CalculationWindow
            editor={editor}
            block={block}
            prop={computeProp}
            column={column}
            columns={list.flatMap((e) => {
              const key = listBinding.keyOf?.(e) ?? ''
              return key === '' ? [] : [{ key, title: listBinding.titleOf(e) }]
            })}
            sources={sources}
          />
        ),
      }]}
      removeLabel={`${listBinding.defaultTitle.replace(/\s*\{n\}/, '')} entfernen`}
      onRemove={listBinding.entryRemove === undefined ? undefined : () => {
        const next = listBinding.entryRemove?.(entriesOf(), pick.index) ?? null
        if (next === null) return
        editor.updateProperty(block.id, listBinding.prop, next)
        onClose()
      }}
      onClose={onClose}
    />
  )
}
