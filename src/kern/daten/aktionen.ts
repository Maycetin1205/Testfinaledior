// Die Aktionskette eines Bausteins: Schritte, Parameter und wie sie gelesen werden.
import type { VormerkArt } from '../maske/faehigkeiten'
import type { RelationsVorlage } from './relationen'

export type SchrittArt =
  | 'START_TOOL'
  | 'BW_LINK'
  | 'RELATION'
  | 'POPUP_OPEN'
  | 'POPUP_CLOSE'

// Die Reihenfolge im Waehler. Wie sie heissen, steht im Editor
// (editor/zentrale/beschriftungen.ts).
export const SCHRITT_ARTEN: readonly SchrittArt[] = [

  'START_TOOL',
  'BW_LINK',
  'RELATION',

  'POPUP_OPEN',
  'POPUP_CLOSE',
]

export const BAUSTEIN_ID_ATTR = 'data-ff-block-id'

export const PARAMETER_QUELLEN = [
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

const GESPEICHERTE_PARAM_QUELLEN = [...PARAMETER_QUELLEN, 'aus'] as const

// Je Zell-Quelle die Vormerk-Liste, deren Zeilen sie liest. Daraus schneidet
// der Lauf seine Abschnitte, ohne einen Bausteintyp zu kennen.
export const ZELLEN_PARAM_QUELLEN: Record<string, VormerkArt> = {
  erfassungszelle: 'erfasst',
  aenderungszelle: 'geaendert',
  loeschzelle: 'geloescht',
}

export type ParameterQuelle = (typeof GESPEICHERTE_PARAM_QUELLEN)[number]

export interface Parameter {
  quelle: ParameterQuelle

  wert: string

  quelleId?: string

  bausteinId?: string

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
  chain: readonly Schritt[],
  stepId: string | undefined, // undefined = neuer Schritt ans Kettenende
): readonly Schritt[] {
  const eigene = stepId === undefined ? -1 : chain.findIndex((s) => s.id === stepId)
  return eigene < 0 ? chain : chain.slice(0, eigene)
}

export function ergebnisSchritteVor(
  chain: readonly Schritt[],
  stepId: string | undefined,
  relations: readonly RelationsVorlage[] | undefined,
): ErgebnisSchritt[] {
  const vorher = schritteVor(chain, stepId)
  const out: ErgebnisSchritt[] = []
  for (let i = 0; i < vorher.length; i++) {
    const s = vorher[i]
    if (s.art !== 'RELATION') continue
    const rel = relations?.find((r) => r.id === s.relationId)
    if (!rel || rel.verb !== 'GET_RELATION') continue
    const quelleId = [...s.parameter, ...s.zusatzParameter]
      .find((b) => b.quelle === 'data_field' && (b.quelleId ?? '') !== '')
      ?.quelleId
    out.push({
      id: s.id, nr: i + 1, name: rel.name,
      ...(quelleId === undefined ? {} : { quelleId }),
    })
  }
  return out
}

interface ActionStepBase {
  id: string
  art: SchrittArt

  ergebnisName: string

  notiz?: string
}

export interface StartToolSchritt extends ActionStepBase {
  art: 'START_TOOL'
  toolNr: string
  toolParameter: string[]
}

// Ein freier BueroWARE-Befehl. START_TOOL hat eine eigene Art, weil sein Link
// fest aufgebaut ist; hier gibt der Bediener die ganze Zeile vor.
export interface BwLinkSchritt extends ActionStepBase {
  art: 'BW_LINK'

  befehl: string
}

export interface RelationsSchritt extends ActionStepBase {
  art: 'RELATION'

  relationId: string

  parameter: Parameter[]

  zusatzParameter: Parameter[]
}

export interface PopupOeffnenSchritt extends ActionStepBase {
  art: 'POPUP_OPEN'
  popupId: string
}

export interface PopupSchliessenSchritt extends ActionStepBase {
  art: 'POPUP_CLOSE'
  popupId: string
}

export type PopupSchritt = PopupOeffnenSchritt | PopupSchliessenSchritt

export type Schritt = StartToolSchritt | BwLinkSchritt | RelationsSchritt | PopupSchritt
export type Ketten = Record<string, Schritt[]>

// Die Satznummer heisst in einer Schreib-Relation {PINDEX} und in einer
// Loesch-Relation {DROP_PINDEX}; leer taugt sie in keiner von beiden.
export const SATZ_PLATZHALTER = ['PINDEX', 'DROP_PINDEX'] as const

export const AKTIONS_PLATZHALTER = [...SATZ_PLATZHALTER, 'VALUE', 'ZIMMER', 'NOW_DATE'] as const

export function relationsParameterVorgabe(
  relation: Pick<RelationsVorlage, 'parameter'>,
): Parameter[] {
  return relation.parameter.map((raw) => {
    const placeholder = /^\{([A-Za-z0-9_]+)\}$/.exec(raw)?.[1]
    return placeholder && (AKTIONS_PLATZHALTER as readonly string[]).includes(placeholder)
      ? { quelle: 'context', wert: placeholder }
      : { quelle: 'fixed', wert: '' }
  })
}

interface RuntimePopupFields {
  ergebnisName: string
  popupId?: string
  popup?: string
}

export type LaufzeitPopupSchritt =
  | (RuntimePopupFields & { art: 'POPUP_OPEN' })
  | (RuntimePopupFields & { art: 'POPUP_CLOSE' })

export type LaufzeitSchritt =
  | Omit<StartToolSchritt, 'id'>
  | Omit<BwLinkSchritt, 'id'>
  | Omit<RelationsSchritt, 'id'>
  | LaufzeitPopupSchritt

function istObjekt(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function pruefeParameterBindung(raw: unknown): Parameter | null {
  if (!istObjekt(raw)) return null
  if (
    typeof raw.quelle !== 'string'
    || !(GESPEICHERTE_PARAM_QUELLEN as readonly string[]).includes(raw.quelle)
    || typeof raw.wert !== 'string'
  ) return null
  if (raw.quelleId !== undefined && typeof raw.quelleId !== 'string') return null
  if (raw.bausteinId !== undefined && typeof raw.bausteinId !== 'string') return null
  if (raw.ergebnisFeld !== undefined && typeof raw.ergebnisFeld !== 'string') return null
  return {
    quelle: raw.quelle as ParameterQuelle,
    wert: raw.wert,
    ...(typeof raw.quelleId === 'string' ? { quelleId: raw.quelleId } : {}),
    ...(typeof raw.bausteinId === 'string' ? { bausteinId: raw.bausteinId } : {}),

    ...(raw.quelle === 'step_result' && typeof raw.ergebnisFeld === 'string'
      ? { ergebnisFeld: raw.ergebnisFeld }
      : {}),
  }
}

function stepFields(raw: unknown): LaufzeitSchritt | null {
  if (!istObjekt(raw) || typeof raw.art !== 'string' || typeof raw.ergebnisName !== 'string') {
    return null
  }
  if (raw.art === 'START_TOOL') {
    if (typeof raw.toolNr !== 'string') return null
    if (!Array.isArray(raw.toolParameter) || raw.toolParameter.some((p) => typeof p !== 'string')) return null
    return {
      art: 'START_TOOL',
      ergebnisName: raw.ergebnisName,
      toolNr: raw.toolNr,
      toolParameter: [...raw.toolParameter] as string[],
    }
  }
  if (raw.art === 'BW_LINK') {
    if (typeof raw.befehl !== 'string') return null
    return { art: 'BW_LINK', ergebnisName: raw.ergebnisName, befehl: raw.befehl }
  }
  if (raw.art === 'POPUP_OPEN' || raw.art === 'POPUP_CLOSE') {
    const popupId = typeof raw.popupId === 'string' ? raw.popupId : undefined
    const popup = typeof raw.popup === 'string' ? raw.popup : undefined
    if (popupId === undefined && popup === undefined) return null
    return {
      art: raw.art,
      ergebnisName: raw.ergebnisName,
      ...(popupId !== undefined ? { popupId } : {}),
      ...(popup !== undefined ? { popup } : {}),
    }
  }
  if (raw.art === 'RELATION') {
    if (typeof raw.relationId !== 'string') return null
    if (!Array.isArray(raw.zusatzParameter)) return null
  // Mit LEEREN params ginge die Relation mit lauter leeren Parametern ins ERP.
    if (!Array.isArray(raw.parameter)) return null
    const params: Parameter[] = []
    for (const value of raw.parameter) {
      const binding = pruefeParameterBindung(value)
      if (!binding) return null
      params.push(binding)
    }

    const extraParams: Parameter[] = []
    for (const value of raw.zusatzParameter) {
      const binding = pruefeParameterBindung(value)
      if (!binding) return null
      extraParams.push(binding)
    }
    return {
      art: 'RELATION',
      ergebnisName: raw.ergebnisName,
      relationId: raw.relationId,
      parameter: params,
      zusatzParameter: extraParams,
    }
  }
  return null
}

// Frueher stand in jedem Parameter `value` neben `wert`, mit demselben Inhalt.
// Der Lader uebernimmt ihn nicht mehr; ohne dieses Abstreifen gilt jede gesicherte
// Maske mit einer Relations-Aktion als beschaedigt und wird ganz verworfen.
export function ohneAltenParameterSchluessel(roh: unknown): unknown {
  if (Array.isArray(roh)) return roh.map(ohneAltenParameterSchluessel)
  if (!istObjekt(roh)) return roh
  const raus: Record<string, unknown> = {}
  for (const [schluessel, wert] of Object.entries(roh)) {
    if (schluessel === 'value' && 'wert' in roh) continue
    raus[schluessel] = ohneAltenParameterSchluessel(wert)
  }
  return raus
}

export function kettenBereinigen(
  raw: unknown,
  allowedEvents: readonly string[],
): Ketten | undefined {
  if (!istObjekt(raw)) return undefined
  const out: Ketten = {}
  for (const key of allowedEvents) {
    const chain = raw[key]
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: Schritt[] = []
    const seenIds = new Set<string>()
    let broken = false
    for (const entry of chain) {
      const fields = stepFields(entry)
      const id = istObjekt(entry) && typeof entry.id === 'string' ? entry.id : ''
      if (!fields || id === '' || seenIds.has(id)) {
        broken = true
        break
      }
      seenIds.add(id)

      const notiz = istObjekt(entry) && typeof entry.notiz === 'string' ? entry.notiz.trim() : ''
      steps.push({ id, ...fields, ...(notiz !== '' ? { notiz } : {}) } as Schritt)
    }
    if (!broken && steps.length > 0) out[key] = steps
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function withoutEditorId(
  step: Schritt,
  popupName: (id: string) => string,

  stepPosition: (id: string) => string,

  spaltenIndex: (blockId: string, kennung: string) => string,
): LaufzeitSchritt {
  const binding = (b: Parameter): Parameter => {
    if (b.quelle === 'step_result') return { ...b, wert: stepPosition(b.wert) }
    // Spalten-Kennung -> Platz: die Laufzeit greift die Zeilenwerte ueber den
    // Index, sie kennt keine Kennungen.
    if (ZELLEN_PARAM_QUELLEN[b.quelle] !== undefined) {
      return { ...b, wert: spaltenIndex(b.bausteinId ?? '', b.wert) }
    }
    return { ...b }
  }
  if (step.art === 'START_TOOL') {
    return {
      art: step.art,
      ergebnisName: step.ergebnisName,
      toolNr: step.toolNr,
      toolParameter: [...step.toolParameter],
    }
  }
  if (step.art === 'BW_LINK') {
    return { art: step.art, ergebnisName: step.ergebnisName, befehl: step.befehl }
  }
  if (step.art === 'POPUP_OPEN' || step.art === 'POPUP_CLOSE') {
    return {
      art: step.art,
      ergebnisName: step.ergebnisName,
      popup: popupName(step.popupId),
    }
  }
  return {
    art: step.art,
    ergebnisName: step.ergebnisName,
    relationId: step.relationId,
    parameter: step.parameter.map(binding),
    zusatzParameter: step.zusatzParameter.map(binding),
  }
}

export function kettenFuerExport(
  events: Ketten | undefined,
  eventOrder: readonly string[],

  popupName: (id: string) => string = () => '',

  // Ohne Aufloeser bleibt die Kennung stehen; der Export reicht immer seinen echten durch.
  spaltenIndex: (blockId: string, kennung: string) => string = (_, kennung) => kennung,
): string | null {
  if (!events) return null
  const out: Record<string, LaufzeitSchritt[]> = {}
  for (const key of eventOrder) {
    const steps = events[key]
    if (!steps?.length) continue

    const position = new Map(steps.map((s, i) => [s.id, String(i)]))
    out[key] = steps.map((step) =>
      withoutEditorId(step, popupName, (id) => position.get(id) ?? '-1', spaltenIndex))
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null
}

export function kettenLesen(raw: string | null): Record<string, LaufzeitSchritt[]> {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!istObjekt(parsed)) return {}
  const out: Record<string, LaufzeitSchritt[]> = {}
  for (const [key, chain] of Object.entries(parsed)) {
    if (!Array.isArray(chain) || chain.length === 0) continue
    const steps: LaufzeitSchritt[] = []
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
type SchrittForm = Schritt | LaufzeitSchritt

interface ZeilenBezug {
  art: VormerkArt

  // Leer heisst: EIN Schritt liest zwei verschiedene Listen.
  blockId: string
}

// Kein Bausteintyp kommt vor: es zaehlt allein, was in den Parametern steht.
function zeilenBezugVon(step: SchrittForm): ZeilenBezug | null {
  if (step.art !== 'RELATION') return null
  let treffer: ZeilenBezug | null = null
  for (const binding of [...step.parameter, ...step.zusatzParameter]) {
    const art = ZELLEN_PARAM_QUELLEN[binding.quelle]
    const blockId = binding.bausteinId ?? ''
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
