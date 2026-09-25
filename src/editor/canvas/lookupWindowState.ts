import { SOURCE_PROP } from '../../core/block/sourceProperty'
import { coerceCaptureColumns, windowColumnsIn, type CaptureColumn } from '../../blocks/capture'
import {
  automaticColumns,
  coerceLookupColumns,
  windowWidthFor,
  openLookup,
} from '../../blocks/lookup/lookup'
import { DIALOG_FRAME_TAG, WINDOW_HEIGHT, type DialogFrame } from '../../blocks/dialog/DialogFrame'
import type { Column } from '../../blocks/list/columns'
import type { BlockNode } from '../../core/block/tree'
import { splitBinding } from '../../core/block/blockType'
import type { BlockLookupWindow, EntryLookupWindow, LookupWindow } from '../../core/block/capability'
import { withEntryValue } from '../../core/block/listBinding'
import { blockType } from '../../core/block/registry'
import type { EditorStore } from '../state/EditorStore'

export interface WindowState {
  sourceId: string

  storageField: string
  storageTitle: string

  title: string

  columns: readonly Column[]

  provided: boolean

  width: number
  height: number

  setColumns: (columns: readonly Column[]) => void

  setMetrics: (axis: 'width' | 'height', value: number | undefined) => void
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : undefined
  if (typeof v !== 'string' || v.trim() === '') return undefined
  const number = Number(v.trim())
  return Number.isFinite(number) ? Math.round(number) : undefined
}

function stateAtBlock(
  ed: EditorStore,
  block: BlockNode,
  window: BlockLookupWindow,
): WindowState | null {
  const sourceId = String(block.values[window.sourceProp ?? ''] ?? '')
  if (sourceId === '') return null
  const declared = blockType(block.type)?.properties ?? {}
  const provided = coerceLookupColumns(block.values[window.columnsKey])
  const storageField = String(block.values[window.storageFieldProp ?? ''] ?? '')
  const storageTitle = String(block.values[window.storageTitleProp ?? ''] ?? '')
  const columns = provided.length > 0
    ? provided
    : automaticColumns({ storageField, storageTitle })
  return {
    sourceId,
    storageField,
    storageTitle,
    title: 'Nachschlagen',
    columns,
    provided: provided.length > 0,
    width: asNumber(block.values[window.widthKey])
      ?? asNumber(declared[window.widthKey]?.default)
      ?? windowWidthFor(columns.length),
    height: asNumber(block.values[window.heightKey])
      ?? asNumber(declared[window.heightKey]?.default)
      ?? WINDOW_HEIGHT,
    setColumns: (next) => {
      ed.updateProperty(block.id, window.columnsKey, [...next])
    },

    setMetrics: (axis, value) => {
      const key = axis === 'width' ? window.widthKey : window.heightKey
      ed.updateProperty(block.id, key, value ?? declared[key]?.default)
    },
  }
}

// Only the capture keeps a window per entry: each of its columns may fill from a field of its own.
function statePerEntry(
  ed: EditorStore,
  block: BlockNode,
  window: EntryLookupWindow,
  slot: number,
): WindowState | null {
  const prop = window.entriesProp
  const entries = coerceCaptureColumns(block.values[prop])
  const entry = entries[slot]
  if (entry === undefined) return null
  const { sourceId, code } = splitBinding(entry.fillField ?? '')

  if (sourceId === '') return null
  const title = entry.title

  const fromColumns = windowColumnsIn({
    columns: entries,
    sourceId: String(block.values[SOURCE_PROP] ?? ''),
    calculations: [],
    pairsTo: () => [],
    partnerOf: () => '',
  }, slot)
  const columns = fromColumns.length > 0
    ? fromColumns
    : automaticColumns({ storageField: code, storageTitle: title })

  const write = (change: (column: CaptureColumn) => CaptureColumn): void => {
    const now = ed.getNode(block.id)
    if (!now) return
    const next = coerceCaptureColumns(now.values[prop])
    const target = next[slot]
    if (!target) return
    next[slot] = change(target)
    ed.updateProperty(block.id, prop, next)
  }

  return {
    sourceId,
    storageField: code,
    storageTitle: title,
    title: title !== '' ? title : `Spalte ${slot + 1}`,
    columns,
    provided: coerceLookupColumns(entry.windowColumns).length > 0,
    width: asNumber(entry.windowWidth) ?? windowWidthFor(columns.length),
    height: asNumber(entry.windowHeight) ?? WINDOW_HEIGHT,
    setColumns: (next) => write((column) =>
      withEntryValue(column, 'windowColumns', next.length === 0 ? undefined : [...next])),
    setMetrics: (axis, value) => write((column) =>
      withEntryValue(column, axis === 'width' ? 'windowWidth' : 'windowHeight', value)),
  }
}

export function windowStateOf(
  ed: EditorStore,
  blockId: string,
  window: LookupWindow,
  slot: number,
): WindowState | null {
  const block = ed.getNode(blockId)
  if (!block) return null
  return window.entriesProp === undefined
    ? stateAtBlock(ed, block, window)
    : statePerEntry(ed, block, window, slot)
}

export function blockElementInEditor(blockId: string, tag: string): HTMLElement | null {
  for (const host of document.querySelectorAll<HTMLElement>('[data-block-id]')) {
    if (host.getAttribute('data-block-id') === blockId) return host.querySelector<HTMLElement>(tag)
  }
  return null
}

export function windowFrameInEditor(): DialogFrame | null {
  return document.body.querySelector<DialogFrame>(
    `${DIALOG_FRAME_TAG}[data-ff-lookup]`,
  )
}

function wireWidths(
  frame: DialogFrame,
  ed: EditorStore,
  blockId: string,
  window: LookupWindow,
  slot: number,
): void {
  frame.querySelector('ff-table')?.addEventListener('ff-prop-change', (event) => {
    const detail = (event as CustomEvent<{ attr?: string; value?: unknown }>).detail
    if (detail?.attr !== 'columns') return
    const dragged = coerceLookupColumns(detail.value)

    const state = windowStateOf(ed, blockId, window, slot)
    if (state === null || dragged.length !== state.columns.length) return
    let different = false
    const next = state.columns.map((s, i) => {
      const width = dragged[i]?.width
      if (width === undefined || width === s.width) return s
      different = true
      return { ...s, width }
    })

    if (different) state.setColumns(next)
  })
}

export function openLookupInEditor(
  ed: EditorStore,
  el: HTMLElement,
  blockId: string,
  window: LookupWindow,
  slot: number,
): boolean {
  const state = windowStateOf(ed, blockId, window, slot)
  if (state === null) return false
  openLookup({
    el,
    sourceId: state.sourceId,
    storageField: state.storageField,
    storageTitle: state.storageTitle,
    columns: state.columns,
    title: state.title,
    width: state.width,
    height: state.height,
    preview: true,
    entries: [],
    onAdopt: () => {},
  })
  const frame = windowFrameInEditor()
  if (frame === null) return false
  wireWidths(frame, ed, blockId, window, slot)
  closesOnClickBeside(frame)
  ed.setLookupWindow({ blockId, window, slot })
  return true
}

// In the editor a click beside the window closes it, like the small windows of
// the bar; a click into the window, into the editor's helpers on it or into a
// window of the editor above it does not.
function closesOnClickBeside(frame: DialogFrame): void {
  const beside = (e: PointerEvent): void => {
    if (!frame.isConnected) {
      document.removeEventListener('pointerdown', beside, true)
      return
    }
    const inside = e.composedPath().some((t) => t instanceof HTMLElement
      && (t.getAttribute('role') === 'dialog' || t.dataset.ffEditorHelper !== undefined))
    if (!inside) frame.close()
  }
  document.addEventListener('pointerdown', beside, true)
}
