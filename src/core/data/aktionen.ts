// Die Aktionskette eines Bausteins: Schritte, Parameter und wie sie gelesen werden.
import type { VormerkArt } from '../blocks/faehigkeiten'
import type { RelationTemplate } from './relations'

export type StepTypeKey =
  | 'START_TOOL'
  | 'BW_LINK'
  | 'RELATION'
  | 'POPUP_OPEN'
  | 'POPUP_CLOSE'

// Die Reihenfolge im Waehler. Wie sie heissen, steht im Editor
// (editor/zentrale/beschriftungen.ts).
export const STEP_TYPE_KEYS: readonly StepTypeKey[] = [

  'START_TOOL',
  'BW_LINK',
  'RELATION',

  'POPUP_OPEN',
  'POPUP_CLOSE',
]

export const ACTION_VALUE_ID_ATTR = 'data-ff-block-id'

export const ACTION_PARAM_SOURCES = [
  'fixed',
  'context',
  'data_field',
  'block_value',
  'gewaehlte_zeile',

  // Der sichtbare Zellwert der jeweiligen erfassten Zeile, Herkunft egal. value
  // ist im BAUM die dauerhafte Spalten-Kennung, im EXPORT der Spalten-Index; die
  // Kette laeuft einmal je Zeile.
  'erfassungszelle',

  // Wie oben, nur fuer die Aenderungen an GEBUCHTEN Zeilen; {PINDEX} traegt die
  // Satznummer genau dieser Zeile.
  'aenderungszelle',

  // Die Zeilen, die der Bediener zum Loeschen vorgemerkt hat; {PINDEX} traegt
  // die Satznummer.
  'loeschzelle',
  'previous_result',
  'step_result',
  'se_variable',
] as const

const GESPEICHERTE_PARAM_QUELLEN = [...ACTION_PARAM_SOURCES, 'aus'] as const

// Je Zell-Quelle die Vormerk-Liste, deren Zeilen sie liest. Daraus schneidet
// der Lauf seine Abschnitte, ohne einen Bausteintyp zu kennen.
export const ZELLEN_PARAM_QUELLEN: Record<string, VormerkArt> = {
  erfassungszelle: 'erfasst',
  aenderungszelle: 'geaendert',
  loeschzelle: 'geloescht',
}

export type ActionParamSource = (typeof GESPEICHERTE_PARAM_QUELLEN)[number]

export interface ActionParamBinding {
  source: ActionParamSource

  value: string

  dataSourceId?: string

  blockId?: string

  ergebnisFeld?: string
}

export interface ErgebnisSchritt {
  id: string
  nr: number
  name: string

  quelleId?: string
}

// Die Schritte VOR diesem. Der Ausschnitt ist ein Anfang der Kette, darum
// bleibt der Platz darin die Schrittnummer.
export function schritteVor(
  chain: readonly ActionStep[],
  stepId: string | undefined, // undefined = neuer Schritt ans Kettenende
): readonly ActionStep[] {
  const eigene = stepId === undefined ? -1 : chain.findIndex((s) => s.id === stepId)
  return eigene < 0 ? chain : chain.slice(0, eigene)
}

export function ergebnisSchritteVor(
  chain: readonly ActionStep[],
  stepId: string | undefined,
  relations: readonly RelationTemplate[] | undefined,
): ErgebnisSchritt[] {
  const vorher = schritteVor(chain, stepId)
  const out: ErgebnisSchritt[] = []
  for (let i = 0; i < vorher.length; i++) {
    const s = vorher[i]
    if (s.type !== 'RELATION') continue
    const rel = relations?.find((r) => r.id === s.relationId)
    if (!rel || rel.verb !== 'GET_RELATION') continue
    const quelleId = [...s.params, ...s.extraParams]
      .find((b) => b.source === 'data_field' && (b.dataSourceId ?? '') !== '')
      ?.dataSourceId
    out.push({
      id: s.id, nr: i + 1, name: rel.name,
      ...(quelleId === undefined ? {} : { quelleId }),
    })
  }
  return out
}

interface ActionStepBase {
  id: string
  type: StepTypeKey

  resultKey: string

  notiz?: string
}

export interface StartToolStep extends ActionStepBase {
  type: 'START_TOOL'
  toolNr: string
  toolParams: string[]
}

// Ein freier BueroWARE-Befehl. START_TOOL hat eine eigene Art, weil sein Link
// fest aufgebaut ist; hier gibt der Bediener die ganze Zeile vor.
export interface BwLinkStep extends ActionStepBase {
  type: 'BW_LINK'

  befehl: string
}

export interface RelationStep extends ActionStepBase {
  type: 'RELATION'

  relationId: string

  params: ActionParamBinding[]

  extraParams: ActionParamBinding[]
}

export interface PopupOpenStep extends ActionStepBase {
  type: 'POPUP_OPEN'
  popupId: string
}

export interface PopupCloseStep extends ActionStepBase {
  type: 'POPUP_CLOSE'
  popupId: string
}

export type PopupStep = PopupOpenStep | PopupCloseStep

export type ActionStep = StartToolStep | BwLinkStep | RelationStep | PopupStep
export type BlockEventsMap = Record<string, ActionStep[]>

// Die Satznummer heisst in einer Schreib-Relation {PINDEX} und in einer
// Loesch-Relation {DROP_PINDEX}; leer taugt sie in keiner von beiden.
export const SATZ_PLATZHALTER = ['PINDEX', 'DROP_PINDEX'] as const

export const AKTIONS_PLATZHALTER = [...SATZ_PLATZHALTER, 'VALUE', 'ZIMMER', 'NOW_DATE'] as const

export function defaultRelationParams(
  relation: Pick<RelationTemplate, 'params'>,
): ActionParamBinding[] {
  return relation.params.map((raw) => {
    const placeholder = /^\{([A-Za-z0-9_]+)\}$/.exec(raw)?.[1]
    return placeholder && (AKTIONS_PLATZHALTER as readonly string[]).includes(placeholder)
      ? { source: 'context', value: placeholder }
      : { source: 'fixed', value: '' }
  })
}

interface RuntimePopupFields {
  resultKey: string
  popupId?: string
  popup?: string
}

export type RuntimePopupStep =
  | (RuntimePopupFields & { type: 'POPUP_OPEN' })
  | (RuntimePopupFields & { type: 'POPUP_CLOSE' })

export type RuntimeStep =
  | Omit<StartToolStep, 'id'>
  | Omit<BwLinkStep, 'id'>
  | Omit<RelationStep, 'id'>
  | RuntimePopupStep

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function pruefeParameterBindung(raw: unknown): ActionParamBinding | null {
  if (!isRecord(raw)) return null
  if (
    typeof raw.source !== 'string'
    || !(GESPEICHERTE_PARAM_QUELLEN as readonly string[]).includes(raw.source)
    || typeof raw.value !== 'string'
  ) return null
  if (raw.dataSourceId !== undefined && typeof raw.dataSourceId !== 'string') return null
  if (raw.blockId !== undefined && typeof raw.blockId !== 'string') return null
  if (raw.ergebnisFeld !== undefined && typeof raw.ergebnisFeld !== 'string') return null
  return {
    source: raw.source as ActionParamSource,
    value: raw.value,
    ...(typeof raw.dataSourceId === 'string' ? { dataSourceId: raw.dataSourceId } : {}),
    ...(typeof raw.blockId === 'string' ? { blockId: raw.blockId } : {}),

    ...(raw.source === 'step_result' && typeof raw.ergebnisFeld === 'string'
      ? { ergebnisFeld: raw.ergebnisFeld }
      : {}),
  }
}

function stepFields(raw: unknown): RuntimeStep | null {
  if (!isRecord(raw) || typeof raw.type !== 'string' || typeof raw.resultKey !== 'string') {
    return null
  }
  if (raw.type === 'START_TOOL') {
    if (typeof raw.toolNr !== 'string') return null
    if (!Array.isArray(raw.toolParams) || raw.toolParams.some((p) => typeof p !== 'string')) return null
    return {
      type: 'START_TOOL',
      resultKey: raw.resultKey,
      toolNr: raw.toolNr,
      toolParams: [...raw.toolParams] as string[],
    }
  }
  if (raw.type === 'BW_LINK') {
    if (typeof raw.befehl !== 'string') return null
    return { type: 'BW_LINK', resultKey: raw.resultKey, befehl: raw.befehl }
  }
  if (raw.type === 'POPUP_OPEN' || raw.type === 'POPUP_CLOSE') {
    const popupId = typeof raw.popupId === 'string' ? raw.popupId : undefined
    const popup = typeof raw.popup === 'string' ? raw.popup : undefined
    if (popupId === undefined && popup === undefined) return null
    return {
      type: raw.type,
      resultKey: raw.resultKey,
      ...(popupId !== undefined ? { popupId } : {}),
      ...(popup !== undefined ? { popup } : {}),
    }
  }
  if (raw.type === 'RELATION') {
    if (typeof raw.relationId !== 'string') return null
    if (!Array.isArray(raw.extraParams)) return null
  // Mit LEEREN params ginge die Relation mit lauter leeren Parametern ins ERP.
    if (!Array.isArray(raw.params)) return null
    const params: ActionParamBinding[] = []
    for (const value of raw.params) {
      const binding = pruefeParameterBindung(value)
      if (!binding) return null
      params.push(binding)
    }

    const extraParams: ActionParamBinding[] = []
    for (const value of raw.extraParams) {
      const binding = pruefeParameterBindung(value)
      if (!binding) return null
      extraParams.push(binding)
    }
    return {
      type: 'RELATION',
      resultKey: raw.resultKey,
      relationId: raw.relationId,
      params,
      extraParams,
    }
  }
  return null
}

export function sanitizeBlockEvents(
  raw: unknown,
  allowedEvents: readonly string[],
): BlockEventsMap | undefined {
  if (!isRecord(raw)) return undefined
  const out: BlockEventsMap = {}
  for (const key of allowedEvents) {
    const chain = raw[key]
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: ActionStep[] = []
    const seenIds = new Set<string>()
    let broken = false
    for (const entry of chain) {
      const fields = stepFields(entry)
      const id = isRecord(entry) && typeof entry.id === 'string' ? entry.id : ''
      if (!fields || id === '' || seenIds.has(id)) {
        broken = true
        break
      }
      seenIds.add(id)

      const notiz = isRecord(entry) && typeof entry.notiz === 'string' ? entry.notiz.trim() : ''
      steps.push({ id, ...fields, ...(notiz !== '' ? { notiz } : {}) } as ActionStep)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function withoutEditorId(
  step: ActionStep,
  popupName: (id: string) => string,

  stepPosition: (id: string) => string,

  spaltenIndex: (blockId: string, kennung: string) => string,
): RuntimeStep {
  const binding = (b: ActionParamBinding): ActionParamBinding => {
    if (b.source === 'step_result') return { ...b, value: stepPosition(b.value) }
    // Spalten-Kennung -> Platz: die Laufzeit greift die Zeilenwerte ueber den
    // Index, sie kennt keine Kennungen.
    if (ZELLEN_PARAM_QUELLEN[b.source] !== undefined) {
      return { ...b, value: spaltenIndex(b.blockId ?? '', b.value) }
    }
    return { ...b }
  }
  if (step.type === 'START_TOOL') {
    return {
      type: step.type,
      resultKey: step.resultKey,
      toolNr: step.toolNr,
      toolParams: [...step.toolParams],
    }
  }
  if (step.type === 'BW_LINK') {
    return { type: step.type, resultKey: step.resultKey, befehl: step.befehl }
  }
  if (step.type === 'POPUP_OPEN' || step.type === 'POPUP_CLOSE') {
    return {
      type: step.type,
      resultKey: step.resultKey,
      popup: popupName(step.popupId),
    }
  }
  return {
    type: step.type,
    resultKey: step.resultKey,
    relationId: step.relationId,
    params: step.params.map(binding),
    extraParams: step.extraParams.map(binding),
  }
}

export function serializeBlockEvents(
  events: BlockEventsMap | undefined,
  eventOrder: readonly string[],

  popupName: (id: string) => string = () => '',

  // Ohne Aufloeser bleibt die Kennung stehen; der Export reicht immer seinen echten durch.
  spaltenIndex: (blockId: string, kennung: string) => string = (_, kennung) => kennung,
): string | null {
  if (!events) return null
  const out: Record<string, RuntimeStep[]> = {}
  for (const key of eventOrder) {
    const steps = events[key]
    if (!steps?.length) continue

    const position = new Map(steps.map((s, i) => [s.id, String(i)]))
    out[key] = steps.map((step) =>
      withoutEditorId(step, popupName, (id) => position.get(id) ?? '-1', spaltenIndex))
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null
}

export function parseBlockEvents(raw: string | null): Record<string, RuntimeStep[]> {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isRecord(parsed)) return {}
  const out: Record<string, RuntimeStep[]> = {}
  for (const [key, chain] of Object.entries(parsed)) {
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: RuntimeStep[] = []
    let broken = false
    for (const entry of chain) {
      const fields = stepFields(entry)
      if (!fields) {
        broken = true
        break
      }
      steps.push(fields)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return out
}

// Beide Formen eines Schritts: der Baum-Schritt mit Spalten-Kennungen und der
// Export-Schritt mit Plaetzen. Fuer die Abschnitte zaehlt nur, WORAUS ein
// Parameter liest.
type SchrittForm = ActionStep | RuntimeStep

interface ZeilenBezug {
  art: VormerkArt

  // Leer heisst: EIN Schritt liest zwei verschiedene Listen.
  blockId: string
}

// Kein Bausteintyp kommt vor: es zaehlt allein, was in den Parametern steht.
function zeilenBezugVon(step: SchrittForm): ZeilenBezug | null {
  if (step.type !== 'RELATION') return null
  let treffer: ZeilenBezug | null = null
  for (const binding of [...step.params, ...step.extraParams]) {
    const art = ZELLEN_PARAM_QUELLEN[binding.source]
    const blockId = binding.blockId ?? ''
    if (art === undefined || blockId === '') continue
    if (treffer && (treffer.art !== art || treffer.blockId !== blockId)) {
      return { art, blockId: '' } // zwei Listen in EINEM Schritt -> Fehler im Lauf
    }
    treffer = { art, blockId }
  }
  return treffer
}

interface Abschnitt {
  art: 'einmal' | VormerkArt

  blockId: string

  // Die Plaetze IN DER GANZEN KETTE: die Schrittzahl bleibt stabil, auch wenn
  // nur ein Teil laeuft.
  plaetze: Set<number>
}

// Ein Schritt ohne Zeilen-Bezug haengt sich an den laufenden Abschnitt an, sonst
// risse „Satz anlegen, dann seine Felder schreiben" auseinander.
export function abschnitteVon(steps: readonly SchrittForm[]): Abschnitt[] {
  const raus: Abschnitt[] = []
  for (const [platz, step] of steps.entries()) {
    const bezug = zeilenBezugVon(step)
    const letzter = raus[raus.length - 1]
    if (bezug === null) {
      if (letzter) letzter.plaetze.add(platz)
      else raus.push({ art: 'einmal', blockId: '', plaetze: new Set([platz]) })
      continue
    }
    if (letzter && letzter.art === bezug.art && letzter.blockId === bezug.blockId) {
      letzter.plaetze.add(platz)
      continue
    }
    raus.push({ art: bezug.art, blockId: bezug.blockId, plaetze: new Set([platz]) })
  }
  return raus
}
