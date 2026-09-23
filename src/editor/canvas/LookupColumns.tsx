import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/editor/widgets/cn'
import { LEVEL_OVER_MASK_WINDOW } from '@/editor/widgets/Popover'
import { Plus } from '@/editor/icons/icon'
import type { DialogFrame } from '../../blocks/behavior/DialogFrame'
import type { Table } from '../../blocks/table/Table'
import {
  newColumn,
  COLUMNS_MAX,
  STANDARD_TITLE,
  type Column,
} from '../../blocks/behavior/columns'
import { sourcesKey } from '../../core/data/dataSources'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import type { OpenLookup } from '../state/EditorStore'
import { useInputSession } from '../inspector/controls/editSession'
import {
  windowFrameInEditor,
  windowStateOf,
  type WindowState,
} from './lookupWindowState'
import { widthFromIcon } from './fieldWidth'
import { FieldPicker, type PickerGroup } from './FieldPicker'

const HANDLE_EDGE = 6

const PLUS_WIDTH = 26

interface Head {
  slot: number

  left: number
  top: number
  width: number
  height: number
}

interface Measurement {
  heads: readonly Head[]

  row: { right: number; top: number; height: number } | null
}

const NOTHING: Measurement = { heads: [], row: null }

function tableIn(frame: DialogFrame): Table | null {
  return frame.querySelector<Table>('ff-table')
}

function measure(frame: DialogFrame): Measurement {
  const row = tableIn(frame)?.shadowRoot?.querySelector('.kopf')
  if (row == null) return NOTHING
  const zr = row.getBoundingClientRect()
  return {
    heads: Array.from(row.querySelectorAll<HTMLElement>(':scope > [data-ff-entry]')).map(
      (el, i) => {
        const r = el.getBoundingClientRect()
        const raw = Number(el.getAttribute('data-ff-entry'))
        return {
          slot: Number.isInteger(raw) ? raw : i,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        }
      },
    ),
    row: { right: zr.right, top: zr.top, height: zr.height },
  }
}

interface Metrics {
  width: number
  height: number
}

function carryTo(frame: DialogFrame, state: WindowState, before: Metrics | null): void {
  const table = tableIn(frame)
  if (table !== null) {
    const columns = [...state.columns]
    if (JSON.stringify(table.columns) !== JSON.stringify(columns)) table.columns = columns
  }

  if (before === null || before.width !== state.width) frame.width = state.width
  if (before === null || before.height !== state.height) frame.height = state.height
}

export function WindowColumns() {
  const open = useView().lookupWindow
  if (open === null) return null

  return <Heads key={`${open.blockId}:${open.slot}`} open={open} />
}

function Heads({ open }: { open: OpenLookup }) {
  const ed = useEditor()
  const library = useDataSources().list
  const [metrics, setMetrics] = useState<Measurement>(NOTHING)
  const [chosen, setChosen] = useState<number | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)
  const typingSession = useInputSession(
    () => ed.beginTransaction(),
    () => ed.endTransaction(),
  )

  useEffect(() => {
    const check = (): void => {
      if (windowFrameInEditor() === null) ed.setLookupWindow(null)
    }
    const mo = new MutationObserver(check)
    mo.observe(document.body, { childList: true })
    check()
    return () => mo.disconnect()
  }, [ed, open])

  useEffect(() => {
    const frame = windowFrameInEditor()
    const table = frame === null ? null : tableIn(frame)
    if (frame === null || table?.shadowRoot == null) return
    const remeasure = (): void => setMetrics(measure(frame))
    const ro = new ResizeObserver(remeasure)
    ro.observe(table)
    const mo = new MutationObserver(remeasure)
    mo.observe(table.shadowRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-ff-entry'],
    })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [open])

  const state = windowStateOf(ed, open.blockId, open.window, open.slot)

  const backfilled = useRef<Metrics | null>(null)
  useEffect(() => {
    const frame = windowFrameInEditor()
    if (frame === null || state === null) return
    carryTo(frame, state, backfilled.current)
    backfilled.current = { width: state.width, height: state.height }
  })

  if (state === null) return null

  const source = library.find((s) => s.id === state.sourceId)
  const groups: PickerGroup[] = source === undefined ? [] : [{
    sourceId: '',
    name: source.name,
    badge: sourcesKey(source),
    fields: source.fields,
  }]

  const change = (slot: number, part: Partial<Column>): void => {
    state.setColumns(state.columns.map((s, i) => (i === slot ? { ...s, ...part } : s)))
  }

  const append = (): void => {
    const slot = state.columns.length
    state.setColumns([...state.columns, newColumn(slot)])
    setChosen(slot)
  }

  const headOfPickers = chosen === null
    ? undefined
    : metrics.heads.find((k) => k.slot === chosen)
  const columnOfPickers = chosen === null ? undefined : state.columns[chosen]
  const standardTitle = STANDARD_TITLE.replace('{n}', String((chosen ?? 0) + 1))

  const plus = state.columns.length < COLUMNS_MAX ? metrics.row : null

  return createPortal(
    <>
      <div
        ref={layerRef}
        data-ff-editor-helper
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: LEVEL_OVER_MASK_WINDOW }}
      >
        {metrics.heads.map((head) => {
          const left = head.left + HANDLE_EDGE
          const right = head.left + head.width - HANDLE_EDGE
          return (
            <div
              key={head.slot}
              className={cn(
                'pointer-events-auto absolute cursor-pointer',
                'hover:bg-[hsl(var(--wb-auswahl)/0.16)]',
                chosen === head.slot && 'bg-[hsl(var(--wb-auswahl)/0.16)]',
              )}
              style={{
                left: left,
                top: head.top,
                width: Math.max(0, right - left),
                height: head.height,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setChosen((v) => (v === head.slot ? null : head.slot))
              }}
            />
          )
        })}

        {plus !== null && (
          <button
            type="button"
            aria-label="Spalte anfügen"
            title="Spalte anfügen"
            className={cn(
              'pointer-events-auto absolute grid cursor-pointer place-items-center rounded border border-[hsl(var(--wb-auswahl)/0.3)] bg-panel shadow-sm',
              'text-[hsl(var(--wb-auswahl))] hover:bg-[hsl(var(--wb-auswahl)/0.16)]',
            )}
            style={{
              left: plus.right - PLUS_WIDTH,
              top: plus.top - 29,
              width: PLUS_WIDTH,
              height: 24,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              append()
            }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {headOfPickers !== undefined && columnOfPickers !== undefined && chosen !== null && (
        <FieldPicker
          key={chosen}
          level={LEVEL_OVER_MASK_WINDOW}
          spotLabel={columnOfPickers.title === '' ? standardTitle : columnOfPickers.title}
          groups={groups}
          title={{
            value: columnOfPickers.title,
            standard: standardTitle,
            onChange: (next) => {
              typingSession.begin()
              change(chosen, { title: next })
            },
            session: typingSession,
          }}
          current={columnOfPickers.field}
          anchor={layerRef}
          top={headOfPickers.top + headOfPickers.height + 4}
          left={headOfPickers.left}

          onPick={(value) => {
            const field = source?.fields.find((f) => f.code === value)
            const plainName = field?.name ?? ''
            const width = widthFromIcon(field?.icon)
            change(chosen, {
              field: value,
              title: value === '' ? standardTitle : (plainName !== '' ? plainName : value),
              ...(width === undefined ? {} : { width }),
            })
          }}
          removeLabel="Spalte entfernen"
          onRemove={!state.provided && state.columns.length <= 1 ? undefined : () => {
            state.setColumns(state.columns.filter((_, i) => i !== chosen))
            setChosen(null)
          }}
          onClose={() => setChosen(null)}
        />
      )}
    </>,
    document.body,
  )
}
