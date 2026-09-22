import {
  BLOCK_ID_ATTR,
  sectionsOf,
  chainsRead,
  RECORD_PLACEHOLDER,
  type RuntimeStep,
} from '../../core/data/actions'
import {
  type WrittenRow,
  type RunReportElement,
  type PendingKind,
  hasCapability,
  contractOf,
} from '../../core/block/capability'
import { selectionFor } from './selection'
import { blockTypeForTag, blockType } from '../../core/block/registry'
import {
  todayAsText,
  placeholderInsert,
  type PlaceholderValues,
} from '../../core/data/relations'
import { sendBwLink, sendStartTool } from '../../softengine/commands'
import { freshDataRequest } from '../../softengine/bridge'
import { reportError } from '../../softengine/report'
import { relationRun, runtimeRelation, parameterResolve } from '../../softengine/relations'

export function applyPopupStep(root: ParentNode, name: string, open: boolean): void {
  if (name.trim() === '') return

  const windowKind = blockType('popup')
  const all = windowKind === undefined ? [] : Array.from(root.querySelectorAll(windowKind.tag))
  const hit = all.filter(
    (el) => (el.getAttribute('name') ?? windowKind?.properties.name?.default) === name,
  )
  if (hit.length === 0) {
    reportError('Fenster „' + name + '“ gibt es in dieser Maske nicht.')
    return
  }
  if (hit.length > 1) {
    reportError('Fenster „' + name + '“ gibt es mehrfach — keines ist gemeint.')
    return
  }
  const target = hit[0]
  if (!open) {
    target.removeAttribute('open')
    return
  }
  for (const el of all) {
    if (el !== target) el.removeAttribute('open')
  }
  target.setAttribute('open', '')
}

const running = new WeakMap<HTMLElement, Set<string>>()

export function reportChainsError(error: unknown): void {
  const text = error instanceof Error ? error.message : String(error)
  reportError('Aktionskette fehlgeschlagen: ' + text)
}

type RowsCarrier = HTMLElement

const CAPABILITY_PER_LIST = { captured: 'capture', changed: 'change', deleted: 'delete' } as const

function reportOn(carrier: RowsCarrier, kind: PendingKind): RunReportElement {
  return contractOf(carrier, CAPABILITY_PER_LIST[kind])
}

export function searchCarrier(root: ParentNode, blockId: string): RowsCarrier | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`))
    .find((el) => el.getAttribute(BLOCK_ID_ATTR) === blockId)
}

interface RunRow {
  record: string
  key: string
  values: readonly string[]
}

export interface RunResult {
  written: boolean

  error: string

  transcript: Transcript
}

export interface Transcript {
  values: Record<string, string | undefined>

  stepResults: readonly string[]

  rawResults: readonly unknown[]

  previousResult: string
}

function rowsTheList(carrier: RowsCarrier, kind: PendingKind): RunRow[] | undefined {
  if (!hasCapability(blockTypeForTag(carrier.tagName), CAPABILITY_PER_LIST[kind])) return undefined
  if (kind === 'captured') {
    const v = contractOf(carrier, 'capture')
    return v.capturedRows.map((values, slot) => ({
      record: '',
      key: v.capturedKey[slot] ?? String(slot),
      values,
    }))
  }
  const raw = kind === 'changed'
    ? contractOf(carrier, 'change').changedRows
    : contractOf(carrier, 'delete').deletedRows
  return raw.map((z) => ({ record: z.record, key: z.record, values: z.values }))
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

export async function runSteps(
  el: HTMLElement,
  steps: readonly RuntimeStep[],
  context: PlaceholderValues,
  rowsCell: ((blockId: string, columnsIndex: number) => string) | undefined,

  only?: ReadonlySet<number>,

  start?: Transcript,
): Promise<RunResult> {
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
    if (step.kind === 'START_TOOL') {
      if (!sendStartTool(step.toolNr, placeholderInsert({ parameter: step.toolParameter }, values))) {
        const text = step.toolNr.trim() === ''
          ? `Schritt ${slot + 1} der Kette: START_TOOL ohne Werkzeug-Nummer.`
          : `Schritt ${slot + 1} der Kette: START_TOOL ${step.toolNr} ging nicht hinaus `
            + '— keine Verbindung zu SoftEngine.'
        reportError(text)
        return { written, error: text, transcript: transcript() }
      }
      continue
    }
    if (step.kind === 'BW_LINK') {
      const command = placeholderInsert({ parameter: [step.command] }, values)[0] ?? ''
      if (!sendBwLink(command)) {
        const text = command.trim() === ''
          ? `Schritt ${slot + 1} der Kette: BW_LINK ohne Befehl.`
          : `Schritt ${slot + 1} der Kette: BW_LINK ging nicht hinaus — keine Verbindung zu SoftEngine.`
        reportError(text)
        return { written, error: text, transcript: transcript() }
      }
      continue
    }
    if (step.kind === 'POPUP_OPEN' || step.kind === 'POPUP_CLOSE') {
      applyPopupStep(el.ownerDocument ?? document, step.popup ?? '', step.kind === 'POPUP_OPEN')
      continue
    }
    const relation = runtimeRelation(step.relationId)

    if (!relation) {
      const text = `Schritt ${slot + 1} der Kette: seine Relation fehlt in dieser Maske.`
      reportError(text)
      return { written, error: text, transcript: transcript() }
    }

    const bindings = [...step.parameter, ...step.extraParameter]

    const missingRecord = RECORD_PLACEHOLDER.find((name) =>
      bindings.some((b) => b.source === 'context' && b.value === name)
      && (values[name] ?? '') === '')
    if (missingRecord !== undefined) {
      const isDeletion = missingRecord === 'DROP_PINDEX'
      const text = `Schritt ${slot + 1} der Kette braucht die Satznummer der `
        + `${isDeletion ? 'zu löschenden Zeile' : 'Zeile'} — sie fehlt `
        + `(Relation Nr. ${relation.nr}). ${isDeletion ? 'Nichts gelöscht.' : 'Nichts geschrieben.'}`
      reportError(text)
      return { written, error: text, transcript: transcript() }
    }

    const runtimeValues = {
      context: values,
      previousResult,
      stepResults,
      stepRawResults: rawResults,
      chosenRow: selectionFor,
      ...(rowsCell ? { rowsCell } : {}),
    }
    const params = bindings.map((binding) => parameterResolve(binding, runtimeValues))
    const answer = await relationRun(relation, params)
    const result = answer.value
    stepResults[slot] = result
    rawResults[slot] = answer.raw

    if (relation.verb === 'GET_RELATION') previousResult = result
    else written = true

    if (answer.error !== undefined && answer.error !== '') {
      return { written, error: answer.error, transcript: transcript() }
    }
    if (step.resultName !== '') values[step.resultName] = result
  }
  return { written, error: '', transcript: transcript() }
}

export interface ActionResult {
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
  if (el.hasAttribute('data-ff-editor')) return empty
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
      carrier: RowsCarrier; kind: PendingKind; finished: WrittenRow[]
    }[] = []
    let written = false
    let cancelled = false

    let rowsSections = 0
    let pendingRows = 0

    let transcript: Transcript | undefined
    for (const section of sections) {
      if (section.kind === 'once') {
        const result = await runSteps(
          el, steps, context, undefined, section.slots, transcript,
        )
        transcript = result.transcript
        if (result.written) written = true
        if (result.error !== '') { cancelled = true; break }
        continue
      }
      if (section.blockId === '') {
        reportError('Ein Schritt liest Zellen aus zwei verschiedenen Listen — das geht nicht.')
        cancelled = true
        break
      }
      const carrier = searchCarrier(el.ownerDocument ?? document, section.blockId)
      const rows = carrier && rowsTheList(carrier, section.kind)
      if (!carrier || !rows) {
        reportError('Den Baustein, dessen Zellen die Kette liest, gibt es in dieser Maske nicht.')
        cancelled = true
        break
      }
      rowsSections += 1
      if (rows.length === 0) continue
      pendingRows += rows.length
      const report = { carrier, kind: section.kind, finished: [] as WrittenRow[] }
      reports.push(report)
      for (const row of rows) {
        reportOn(carrier, section.kind).rowWrites(section.kind, row.key)

        const result = await runSteps(el, steps, rowsContext(context, section.kind, row),
          (blockId, columnsIndex) =>
            (blockId === section.blockId ? String(row.values[columnsIndex] ?? '') : ''),
          section.slots, transcript)
        if (result.written) written = true

        if (result.error !== '') {
          reportOn(carrier, section.kind).rowFailed(section.kind, row.key, result.error)
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

    if (!cancelled && rowsSections > 0 && pendingRows === 0) {
      reportError('Nichts zum Speichern vorgemerkt.')
    }

    for (const { carrier, kind, finished } of reports) reportOn(carrier, kind).runDone(kind, finished)

    if (written) freshDataRequest()
    return { ran: true, written, cancelled, busy: false }
  } finally {
    locks.delete(eventKey)
  }
}
