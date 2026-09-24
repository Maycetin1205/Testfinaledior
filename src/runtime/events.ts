import { BLOCK_ID_ATTR } from '../core/data/actions'
import { sectionsOf, chainsRead } from '../core/data/steps/chains'
import { stepAdapter, type RuntimeStep } from '../core/data/steps/steps'
import type { WrittenRow, RunReportElement, PendingKind } from '../core/block/capability'
import { selectionFor } from './selection'
import { maskState } from './maskState'
import { contractOf } from '../core/block/registry'
import { todayAsText, type PlaceholderValues } from '../core/data/relations'

const running = new WeakMap<HTMLElement, Set<string>>()

type RowsCarrier = HTMLElement

export function searchCarrier(root: ParentNode, blockId: string): RowsCarrier | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`))
    .find((el) => el.getAttribute(BLOCK_ID_ATTR) === blockId)
}

interface RunRow {
  record: string
  key: string
  values: readonly string[]
}

interface RunResult {
  written: boolean

  failed: boolean

  transcript: Transcript
}

interface Transcript {
  values: Record<string, string | undefined>

  stepResults: readonly string[]

  rawResults: readonly unknown[]

  previousResult: string
}

// The rows a section runs over, and whom it reports each row to.
interface ListRun {
  rows: RunRow[]
  report: RunReportElement
}

function bookedRows(raw: readonly { record: string; values: readonly string[] }[]): RunRow[] {
  return raw.map((z) => ({ record: z.record, key: z.record, values: z.values }))
}

function rowsOfList(carrier: RowsCarrier, kind: PendingKind): ListRun | undefined {
  if (kind === 'captured') {
    const capture = contractOf(carrier, 'capture')
    return capture && {
      report: capture,
      rows: capture.capturedRows.map((values, slot) => ({
        record: '',
        key: capture.capturedKey[slot] ?? String(slot),
        values,
      })),
    }
  }
  if (kind === 'changed') {
    const change = contractOf(carrier, 'change')
    return change && { report: change, rows: bookedRows(change.changedRows) }
  }
  const deletion = contractOf(carrier, 'delete')
  return deletion && { report: deletion, rows: bookedRows(deletion.deletedRows) }
}

function rowsContext(
  context: PlaceholderValues,
  kind: PendingKind,
  row: RunRow,
): PlaceholderValues {
  if (row.record === '') return context
  if (kind === 'deleted') {
    return { ...context, PINDEX: row.record, DROP_PINDEX: row.record }
  }
  return { ...context, PINDEX: row.record }
}

function recordOfRun(transcript: Transcript, row: RunRow): string {
  if (row.record !== '') return row.record
  return transcript.values.PINDEX ?? ''
}

async function runSteps(
  el: HTMLElement,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
  rowsCell: ((blockId: string, columnsIndex: number) => string) | undefined,

  only?: ReadonlySet<number>,

  start?: Transcript,
): Promise<RunResult> {
  const host = maskState.host
  let written = false
  const values: Record<string, string | undefined> = {
    ...start?.values,
    ...context,
    NOW_DATE: todayAsText(new Date()),
  }
  let previousResult = start?.previousResult ?? ''

  const stepResults: string[] = steps.map((_, i) => start?.stepResults[i] ?? '')

  const rawResults: unknown[] = steps.map((_, i) => start?.rawResults[i])
  const transcript = (): Transcript => ({
    values, stepResults, rawResults, previousResult,
  })
  for (const [slot, step] of steps.entries()) {
    if (only && !only.has(slot)) continue
    const outcome = await stepAdapter(step.kind).run(step, {
      host,
      root: el.ownerDocument ?? document,
      values,
      parameterValues: {
        context: values,
        previousResult,
        stepResults,
        stepRawResults: rawResults,
        chosenRow: selectionFor,
        ...(rowsCell ? { rowsCell } : {}),
      },
    })
    const answer = outcome.answer
    if (answer) {
      stepResults[slot] = answer.value
      rawResults[slot] = answer.raw
      if (answer.wrote) written = true
      else previousResult = answer.value
    }
    if (outcome.failed) return { written, failed: true, transcript: transcript() }
    if (answer && step.resultName !== '') values[step.resultName] = answer.value
  }
  return { written, failed: false, transcript: transcript() }
}

interface ActionResult {
  ran: boolean
  written: boolean
  cancelled: boolean
  busy: boolean
}

export async function runEvent(
  el: HTMLElement,
  eventKey: string,
  context: PlaceholderValues,
): Promise<ActionResult> {
  const empty = { ran: false, written: false, cancelled: false, busy: false }
  const steps = chainsRead(el.getAttribute('data-ff-actions'))[eventKey]
  if (!steps || steps.length === 0) return empty

  let locks = running.get(el)
  if (!locks) {
    locks = new Set()
    running.set(el, locks)
  }
  if (locks.has(eventKey)) return { ...empty, busy: true }
  locks.add(eventKey)
  try {
    const sections = sectionsOf(steps)
    const reports: {
      report: RunReportElement; kind: PendingKind; finished: WrittenRow[]
    }[] = []
    let written = false
    let cancelled = false

    let transcript: Transcript | undefined
    for (const section of sections) {
      if (section.kind === 'once') {
        const result = await runSteps(
          el, steps, context, undefined, section.slots, transcript,
        )
        transcript = result.transcript
        if (result.written) written = true
        if (result.failed) { cancelled = true; break }
        continue
      }
      if (section.blockId === '') {
        cancelled = true
        break
      }
      const carrier = searchCarrier(el.ownerDocument ?? document, section.blockId)
      const list = carrier && rowsOfList(carrier, section.kind)
      if (!list) {
        cancelled = true
        break
      }
      if (list.rows.length === 0) continue
      const report = { report: list.report, kind: section.kind, finished: [] as WrittenRow[] }
      reports.push(report)
      for (const row of list.rows) {
        list.report.rowWrites(section.kind, row.key)

        const result = await runSteps(el, steps, rowsContext(context, section.kind, row),
          (blockId, columnsIndex) =>
            (blockId === section.blockId ? String(row.values[columnsIndex] ?? '') : ''),
          section.slots, transcript)
        if (result.written) written = true

        if (result.failed) {
          list.report.rowFailed(section.kind, row.key)
          cancelled = true
          break
        }
        report.finished.push({
          key: row.key,
          record: recordOfRun(result.transcript, row),
        })
      }
      if (cancelled) break
    }

    for (const { report, kind, finished } of reports) report.runDone(kind, finished)

    if (written) maskState.host.requestFreshData()
    return { ran: true, written, cancelled, busy: false }
  } finally {
    locks.delete(eventKey)
  }
}
