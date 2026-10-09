// The time trace of a mask's start, for the console of the WebView: when the
// mask signed in, when the first document came, every question to SoftEngine
// sent and answered, and when none was open any more. Milliseconds since the
// page began. Nothing on the data way reads it. SoftEngine's own masks log to
// the console as well; a way into SoftEngine's debug log is not known
// (docs/softengine-wiki/funktionen.md, f).

const PREFIX = 'FF-ZEIT'

// No question sent for this long after the last answer: the mask is done.
const QUIET_MS = 1000

type QuestionKind = 'ERPAPICALL' | 'GET_RELATION'

const trace = {
  lines: [] as string[],
  document: false,
  done: false,
  open: 0,
  quiet: null as ReturnType<typeof setTimeout> | null,
  asked: { ERPAPICALL: 0, GET_RELATION: 0 } as Record<QuestionKind, number>,
}

function now(): number {
  return Math.round(performance.now())
}

function write(ms: number, text: string): void {
  const line = `${PREFIX} ${String(ms).padStart(6)} ms  ${text}`
  trace.lines.push(line)
  // All lines at once for copying: copy(FF_ZEIT.join('\n')) in the console.
  const page = globalThis as typeof globalThis & { FF_ZEIT?: string[] }
  page.FF_ZEIT = trace.lines
  console.log(line)
}

function quietStop(): void {
  if (trace.quiet === null) return
  clearTimeout(trace.quiet)
  trace.quiet = null
}

// Done counts from the moment nothing was open, written once it stayed so.
function settle(): void {
  if (trace.done || !trace.document || trace.open > 0) return
  const since = now()
  quietStop()
  trace.quiet = setTimeout(() => {
    trace.quiet = null
    trace.done = true
    const { ERPAPICALL, GET_RELATION } = trace.asked
    write(since, `Maske fertig (${ERPAPICALL} ERPAPICALL, ${GET_RELATION} GET_RELATION)`)
  }, QUIET_MS)
}

export function traceSignIn(): void {
  write(now(), 'Anmeldung gesendet')
}

export function traceDocument(): void {
  if (trace.document) return
  trace.document = true
  write(now(), 'erstes Dokument da')
  settle()
}

// A question goes out now; the function returned writes its end, once.
export function traceQuestion(kind: QuestionKind, what: string): (outcome: string, detail?: string) => void {
  const sent = now()
  trace.asked[kind] += 1
  trace.open += 1
  quietStop()
  write(sent, `${kind} gesendet ${what}`)
  let ended = false
  return (outcome, detail) => {
    if (ended) return
    ended = true
    trace.open -= 1
    const back = now()
    write(back, `${kind} ${outcome} ${what}${detail ? `: ${detail}` : ''}, ${back - sent} ms`)
    settle()
  }
}
