import type { TemplateResult } from 'lit'
import { openLookup } from './lookup'
import { keyOf } from './suggestionState'
import type { CaptureRun } from './captureRun'
import {
  captureRowTpl,
  windowColumnsIn,
  targetIn,
  type CaptureContext,
} from './captureRow'
import type { ColumnView } from './columns'

export interface CaptureHost {
  block: HTMLElement

  run: CaptureRun

  context: () => CaptureContext

  report: () => void

  focus: (index: number) => void

  captureRow: () => boolean

  titleInCell: () => boolean

  windowMetrics: () => { width: number; height: number }
}

function choose(host: CaptureHost, index: number, listIndex: number): void {
  const hit = host.run.suggestions[listIndex]
  if (hit === undefined) return
  host.run.adopt(host.context(), index, hit.record)
  host.report()
}

function window(host: CaptureHost, index: number): void {
  const context = host.context()
  const column = context.columns[index]
  const target = targetIn(context, index)
  if (column === undefined || target.sourceId === '' || target.code === '') return
  const columns = windowColumnsIn(context, index)
  openLookup({
    el: host.block,
    spot: column.key,
    sourceId: target.sourceId,
    storageField: target.code,
    storageTitle: column.title,
    columns,
    title: column.title,
    ...host.windowMetrics(),
    entries: host.run.entries(context, index),

    backFocus: () => host.focus(index),
    searchText: host.run.valueAt(context, index),
    onAdopt: (_display, _value, record) => {
      host.run.adopt(host.context(), index, record)
      host.report()
      jump(host, index, 'Enter')
    },
  })
}

export function jump(host: CaptureHost, index: number, key: string): boolean {
  const context = host.context()
  if (key === 'Tab') {
    const next = host.run.neighbourSlot(context, index, 1)
    if (next !== -1) {
      host.focus(next)
      return true
    }
    return host.captureRow()
  }
  const target = host.run.nextEmpty(context, index)
  if (target !== -1) host.focus(target)
  else if (key === 'Enter') host.captureRow()
  return true
}

function key(host: CaptureHost, index: number, e: KeyboardEvent): void {
  if (e.key === 'F5') e.preventDefault()

  if (e.key === 'Tab' && e.shiftKey) {
    const previous = host.run.neighbourSlot(host.context(), index, -1)
    if (previous === -1) return
    e.preventDefault()
    host.focus(previous)
    host.report()
    return
  }
  const follow = host.run.decideKey(host.context(), index, keyOf(e))
  if (follow === 'nothing') {
    if (e.key === 'Enter') e.preventDefault()
    return
  }
  let keep = true
  if (follow === 'adopt') {
    choose(host, index, host.run.mark)
    keep = jump(host, index, e.key)
  } else if (follow === 'window') window(host, index)
  else if (follow === 'liste-auf') host.run.openList(index)
  else if (follow === 'further') keep = jump(host, index, e.key)
  else if (follow === 'clear') host.run.empty(host.context(), index)
  if (keep) e.preventDefault()
  host.report()
}

export function captureRowFor(
  host: CaptureHost,
  cols: Readonly<Record<string, string>>,
  listToTop: boolean,

  view: ColumnView,
): TemplateResult {
  const context = host.context()
  return captureRowTpl({
    columns: view.columns,
    slots: view.slots,
    sourceId: context.sourceId,
    cols,
    titleInCell: host.titleInCell(),
    inEditor: host.block.hasAttribute('data-ff-editor'),
    value: (i) => host.run.valueAt(context, i),
    automatic: (i) => host.run.isAutomatic(context, i),
    typingColumn: host.run.typingColumn,
    suggestions: host.run.suggestions,
    mark: host.run.mark,
    listToTop,
    hints: host.run.hints,
  }, {
    typing: (i, text) => {
      host.run.type(i, text)
      host.report()
    },
    key: (i, e) => key(host, i, e),
    leave: (i) => {
      host.run.leave(i)
      host.report()
    },
    chooseSuggestion: (listIndex) => choose(host, host.run.typingColumn, listIndex),
    setMark: (listIndex) => {
      host.run.setMark(listIndex)
      host.report()
    },
  })
}
