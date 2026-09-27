import { checkLoadRelation } from '../../core/data/deliveries/relationRows'
import { checkGetValue } from '../../core/data/deliveries/relationValue'
import { isPresetId, sourcePreset } from '../../core/data/presets/presets'
import { EMPTY_CHOICE, descriptorFor } from '../../core/data/presets/sourcePreset'

// Lifts a saved mask to the format this editor reads; a file below a version
// first runs the steps of every older one.
export const CURRENT_SCHEMA_VERSION = 22

const ENGLISH_NAMES = 16

const LIFTABLE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function to(o: Record<string, unknown>, pairs: Record<string, string>): void {
  for (const [old, next] of Object.entries(pairs)) {
    if (old in o && !(next in o)) {
      o[next] = o[old]
      delete o[old]
    }
  }
}

// ---- up to version 10: the keys the very first files used ----

function liftV9Keys(x: unknown): void {
  if (Array.isArray(x)) { x.forEach(liftV9Keys); return }
  if (!isPlainObject(x)) return
  if ('childIds' in x) to(x, { type: 'typ', props: 'werte', events: 'ketten', parentId: 'elternId', childIds: 'kinderIds' })
  if ('resultKey' in x) to(x, { type: 'art', resultKey: 'ergebnisName', params: 'parameter', extraParams: 'zusatzParameter', toolParams: 'toolParameter' })
  if ('source' in x && 'value' in x && !('id' in x)) to(x, { source: 'quelle', value: 'wert', dataSourceId: 'quelleId', blockId: 'bausteinId' })
  if ('kind' in x && 'fields' in x) to(x, { kind: 'art', fields: 'felder', indexField: 'satzFeld' })
  if ('code' in x && 'label' in x) to(x, { label: 'name' })
  if ('verb' in x && 'params' in x) to(x, { params: 'parameter', allowExtraParams: 'zusatzParameterErlaubt' })
  if ('relationId' in x && 'params' in x) to(x, { params: 'parameter' })
  if ('fromField' in x) to(x, { fromField: 'vonFeld', toField: 'nachFeld' })
  if ('keyPairs' in x) to(x, { keyPairs: 'paare' })
  for (const value of Object.values(x)) liftV9Keys(value)
}

export function liftKey<T>(raw: T): T {
  const copy = JSON.parse(JSON.stringify(raw)) as T
  liftV9Keys(copy)
  return copy
}

// ---- versions 10 to 15: still German, older block names ----

function liftBlockNames(x: unknown): void {
  if (!isPlainObject(x)) return
  for (const node of Object.values(x)) {
    if (!isPlainObject(node) || typeof node.typ !== 'string' || !isPlainObject(node.werte)) continue
    to(node.werte, { source: 'quelle', tagField: 'tagFeld' })

    if (node.typ === 'formfeld') {
      to(node.werte, {
        fieldType: 'feldTyp',
        placeholder: 'beschriftung',
        options: 'optionen',
        value: 'wert',
        valueField: 'wertField',
      })
    }

    if (node.typ === 'button') to(node.werte, { label: 'beschriftung' })

    if (node.typ === 'card') {
      to(node.werte, {
        heading: 'titel', heading2: 'titel2', time: 'zeit', date: 'datum',
        meta: 'unterzeile', chipText: 'chip', chipVariant: 'chipFarbwelt',
        headingField: 'titelField', heading2Field: 'titel2Field', timeField: 'zeitField',
        dateField: 'datumField', metaField: 'unterzeileField', chipTextField: 'chipField',
      })
      node.typ = 'karte'
    }
    if (node.typ === 'kanban') to(node.werte, { statusField: 'spaltenFeld' })
    if (node.typ === 'kanban-spalte') {
      to(node.werte, { heading: 'titel', variant: 'farbwelt', zimmerField: 'unterteilungsFeld' })
    }
    if (node.typ === 'kanban-zimmer') to(node.werte, { heading: 'titel' })
    if (isPlainObject(node.ketten)) {
      to(node.ketten, { onRowClick: 'zeileGewaehlt', onRowDblClick: 'zeileDoppelt', onF4: 'tasteF4' })
    }
  }
}

function liftCardsTemplate(x: unknown): void {
  if (!isPlainObject(x)) return
  for (const [id, node] of Object.entries(x)) {
    if (!isPlainObject(node) || node.typ !== 'kanban-muster') continue
    const parentId = typeof node.elternId === 'string' ? node.elternId : ''
    const children = Array.isArray(node.kinderIds)
      ? node.kinderIds.filter((k): k is string => typeof k === 'string')
      : []
    const parent = x[parentId]
    const carries = isPlainObject(parent) && Array.isArray(parent.kinderIds)
    if (carries) {
      parent.kinderIds = (parent.kinderIds as unknown[]).flatMap((k) => (k === id ? children : [k]))
    }
    for (const child of children) {
      const childNode = x[child]
      if (!isPlainObject(childNode)) continue
      if (carries) childNode.elternId = parentId
      else delete x[child]
    }
    delete x[id]
  }
}

function liftAreaTitle(x: unknown): void {
  if (!isPlainObject(x)) return
  for (const node of Object.values(x)) {
    if (!isPlainObject(node) || node.typ !== 'bereich' || !isPlainObject(node.werte)) continue
    delete node.werte.titel
    delete node.werte.titelZeigen
  }
}

function liftLegacy(x: unknown): void {
  if (Array.isArray(x)) { x.forEach(liftLegacy); return }
  if (!isPlainObject(x)) return
  if ('quelle' in x && 'wert' in x && 'value' in x && x.value === x.wert) delete x.value
  for (const value of Object.values(x)) liftLegacy(value)
}

// ---- version 16: every stored name in English ----

const NODE_KEYS: Record<string, string> = {
  typ: 'type', werte: 'values', ketten: 'chains', elternId: 'parentId', kinderIds: 'childIds',
}

const BLOCK_TYPES: Record<string, string> = {
  tabelle: 'table',
  erfassung: 'capture',
  karte: 'card',
  datum: 'date',
  bereich: 'area',
  formfeld: 'formfield',
  'kanban-spalte': 'kanban-column',
  'kanban-zimmer': 'kanban-room',
}

const EVERY_BLOCK: Record<string, string> = {
  rasterX: 'gridX', rasterY: 'gridY', rasterW: 'gridW', rasterH: 'gridH',
  quelle: 'source', weitereQuellen: 'extraSources', folgtAuswahl: 'followsSelection',
  tagFeld: 'dayField', leerText: 'emptyText',
}

const PER_TYPE: Record<string, Record<string, string>> = {
  root: { maskenName: 'maskName', belegRahmen: 'documentFrame' },
  table: {
    spalten: 'columns', suche: 'search', blaettern: 'paging',
    kopfzeile: 'headerRow', spaltenwahl: 'columnPicker',
  },
  capture: {
    spalten: 'columns', suche: 'search', blaettern: 'paging',
    kopfzeile: 'headerRow', spaltenwahl: 'columnPicker',
    loeschbar: 'deletable', berechnungen: 'calculations',
    fensterBreite: 'windowWidth', fensterHoehe: 'windowHeight',
  },
  formfield: {
    feldTyp: 'fieldType', beschriftung: 'label', optionen: 'options',
    wert: 'value', wertField: 'valueField', nachschlagQuelle: 'lookupSource',
    speicherFeld: 'storageField', speicherTitel: 'storageTitle',
    nachschlagSpalten: 'lookupColumns', fensterBreite: 'windowWidth',
    fensterHoehe: 'windowHeight', einzigerTreffer: 'onlyHit', darstellung: 'appearance',
  },
  button: { beschriftung: 'label' },
  text: { groesse: 'size', gewicht: 'weight', ausrichtung: 'align', farbe: 'color' },
  card: {
    chipFarbwelt: 'chipTone', titel: 'heading', titel2: 'heading2', zeit: 'time',
    datum: 'date', unterzeile: 'subline', titelField: 'headingField',
    titel2Field: 'heading2Field', zeitField: 'timeField', datumField: 'dateField',
    unterzeileField: 'sublineField',
  },
  kanban: { spaltenFeld: 'columnsField' },
  'kanban-column': {
    farbwelt: 'tone', titel: 'heading', wert: 'value',
    auffang: 'catchAll', unterteilungsFeld: 'groupingField',
  },
  'kanban-room': { titel: 'heading', wert: 'value' },
  popup: { breite: 'popupWidth', hoehe: 'popupHeight' },
}

const BOOLEANS: Record<string, readonly string[]> = {
  table: ['search', 'paging', 'headerRow', 'columnPicker'],
  capture: ['search', 'paging', 'headerRow', 'columnPicker', 'deletable'],
  formfield: ['onlyHit'],
  'kanban-column': ['catchAll'],
}

const VALUE_WORDS: Record<string, Record<string, Record<string, string>>> = {
  text: {
    weight: { duenn: 'thin', fett: 'bold' },
    align: { links: 'left', mitte: 'center', rechts: 'right' },
    color: { gedaempft: 'muted', akzent: 'accent' },
  },
  formfield: {
    fieldType: { nachschlagen: 'lookup' },
    appearance: { linie: 'line' },
  },
}

const CHAIN_KEYS: Record<string, string> = {
  zeileGewaehlt: 'rowChosen', zeileDoppelt: 'rowDouble', tasteF4: 'keyF4',
}

const STEP_KEYS: Record<string, string> = {
  art: 'kind', ergebnisName: 'resultName', zusatzParameter: 'extraParameter',
  befehl: 'command',
}

const PARAMETER_KEYS: Record<string, string> = {
  quelle: 'source', wert: 'value', bausteinId: 'blockId',
  quelleId: 'sourceId', ergebnisFeld: 'resultField',
}

const PARAMETER_SOURCES: Record<string, string> = {
  erfassungszelle: 'captureCell', aenderungszelle: 'changeCell', loeschzelle: 'deleteCell',
  gewaehlte_zeile: 'chosenRow', se_variable: 'seVariable', datenfeld: 'dataField', aus: 'from',
}

const COLUMN_KEYS: Record<string, string> = {
  kennung: 'key', titel: 'title', feld: 'field', breite: 'width', summe: 'total',
  versteckt: 'hidden', art: 'kind', fuellFeld: 'fillField', aenderbar: 'editable',
  fensterSpalten: 'windowColumns',
}

const CALCULATION_KEYS: Record<string, string> = {
  kennung: 'key', leit: 'lead', zaehler: 'numerator', nenner: 'denominator',
  einheit: 'unit', ergebnis: 'result', runden: 'round', stellen: 'spots',
  richtung: 'direction', spalte: 'column', zahl: 'number', art: 'kind',
}

const EXTRA_SOURCE_KEYS: Record<string, string> = {
  quelleId: 'sourceId', paare: 'pairs', vonFeld: 'ofField', nachFeld: 'toField',
  geberId: 'giverId',
}

const SOURCE_KEYS: Record<string, string> = {
  art: 'kind', felder: 'fields', satzFeld: 'recordField', kopfsatzIndex: 'headerKeyIndex',
  lieferung: 'delivery', ladeRelation: 'loadRelation', holWert: 'getValue',
  feldVorsatz: 'fieldPrefix', bereich: 'area', zeichen: 'icon',
  belegartFeld: 'documentKindField', belegnummerFeld: 'documentNumberField',
  jahrFeld: 'yearField', archivFeld: 'archiveField', endeFelder: 'endFields',
  zusatzParameterErlaubt: 'extraParameterAllowed', offenerSatz: 'openRecord',
}

const SOURCE_KINDS: Record<string, string> = {
  adressstamm: 'addressMaster', artikelstamm: 'itemMaster', beleg: 'document',
  belegposition: 'documentItem', datei: 'file', relationswert: 'relationValue',
  erpabfrage: 'erpQuery', erpmaske: 'erpMask',
}

const DELIVERY_VALUES: Record<string, string> = { liste: 'list', offenerSatz: 'openRecord' }

function renameDeep(x: unknown, pairs: Record<string, string>): void {
  if (Array.isArray(x)) { x.forEach((e) => renameDeep(e, pairs)); return }
  if (!isPlainObject(x)) return
  to(x, pairs)
  for (const value of Object.values(x)) renameDeep(value, pairs)
}

function liftSteps(chains: Record<string, unknown>): void {
  to(chains, CHAIN_KEYS)
  for (const steps of Object.values(chains)) {
    if (!Array.isArray(steps)) continue
    for (const step of steps) {
      if (!isPlainObject(step)) continue
      to(step, STEP_KEYS)
      for (const list of ['parameter', 'extraParameter']) liftParameters(step[list])
    }
  }
}

function liftParameters(params: unknown): void {
  if (!Array.isArray(params)) return
  for (const p of params) {
    if (!isPlainObject(p)) continue
    to(p, PARAMETER_KEYS)
    const from = p.source
    if (typeof from === 'string' && from in PARAMETER_SOURCES) p.source = PARAMETER_SOURCES[from]
  }
}

// Data sources and relation templates come from the customer file and from
// masks saved before the split; both readers come through here.
export function liftLibraries(state: Record<string, unknown>): void {
  const sources = state.datenquellen ?? state.dataSources
  if (Array.isArray(sources)) {
    renameDeep(sources, SOURCE_KEYS)
    for (const source of sources) {
      if (!isPlainObject(source)) continue
      const kind = source.kind
      if (typeof kind === 'string' && kind in SOURCE_KINDS) source.kind = SOURCE_KINDS[kind]
      const delivery = source.delivery
      if (typeof delivery === 'string' && delivery in DELIVERY_VALUES) source.delivery = DELIVERY_VALUES[delivery]
      if (isPlainObject(source.getValue)) liftParameters(source.getValue.parameter)
    }
  }
  const relations = state.relationen ?? state.relations ?? state.relation
  if (Array.isArray(relations)) renameDeep(relations, SOURCE_KEYS)
  to(state, { datenquellen: 'dataSources', relationen: 'relation', relations: 'relation' })
}

function liftValues(type: string, values: Record<string, unknown>): void {
  to(values, EVERY_BLOCK)
  const perType = PER_TYPE[type]
  if (perType) to(values, perType)

  for (const key of BOOLEANS[type] ?? []) {
    const held = values[key]
    if (typeof held === 'string') values[key] = held === 'ja'
  }

  const words = VALUE_WORDS[type]
  if (words) {
    for (const [key, table] of Object.entries(words)) {
      const held = values[key]
      if (typeof held === 'string' && held in table) values[key] = table[held]
    }
  }

  if (type === 'text') {
    const size = values.size
    if (size === 'ueberschrift') values.size = 15
    else if (size === 'klein') values.size = 12
    else if (typeof size === 'string') {
      const parsed = Number.parseFloat(size)
      values.size = Number.isFinite(parsed) ? parsed : 14
    }
  }

  for (const key of ['columns', 'lookupColumns', 'windowColumns']) {
    if (Array.isArray(values[key])) renameDeep(values[key], COLUMN_KEYS)
  }
  if (Array.isArray(values.calculations)) renameDeep(values.calculations, CALCULATION_KEYS)
  for (const key of ['extraSources', 'followsSelection']) {
    if (Array.isArray(values[key])) renameDeep(values[key], EXTRA_SOURCE_KEYS)
  }
}

function liftToEnglish(state: Record<string, unknown>): void {
  const tree = state.tree
  if (isPlainObject(tree)) {
    for (const node of Object.values(tree)) {
      if (!isPlainObject(node)) continue
      to(node, NODE_KEYS)
      const type = typeof node.type === 'string' ? (BLOCK_TYPES[node.type] ?? node.type) : ''
      node.type = type
      if (isPlainObject(node.values)) liftValues(type, node.values)
      if (isPlainObject(node.chains)) liftSteps(node.chains)
    }
  }

  liftLibraries(state)
}

// ---- version 17: the names the english rename missed ----

const BLOCK_TYPES_17: Record<string, string> = { 'kanban-zimmer': 'kanban-room' }

const PER_TYPE_17: Record<string, Record<string, string>> = {
  'kanban-column': { title: 'heading' },
  'kanban-room': { title: 'heading' },
}

const VALUE_WORDS_17: Record<string, Record<string, Record<string, string>>> = {
  text: { color: { gedaempft: 'muted' } },
}

// The mark that a column title was typed by hand, inside every column list.
const ENTRY_KEYS_17: Record<string, string> = { titelVonHand: 'titleByHand' }

function liftMissedNames(x: unknown): void {
  if (!isPlainObject(x)) return
  for (const node of Object.values(x)) {
    if (!isPlainObject(node) || typeof node.type !== 'string') continue
    const type = BLOCK_TYPES_17[node.type] ?? node.type
    node.type = type
    const values = node.values
    if (!isPlainObject(values)) continue

    const perType = PER_TYPE_17[type]
    if (perType) to(values, perType)

    const words = VALUE_WORDS_17[type]
    for (const [key, table] of Object.entries(words ?? {})) {
      const held = values[key]
      if (typeof held === 'string' && held in table) values[key] = table[held]
    }

    for (const key of ['columns', 'lookupColumns']) {
      if (Array.isArray(values[key])) renameDeep(values[key], ENTRY_KEYS_17)
    }
  }
}

export function liftState(raw: unknown): unknown {
  if (!isPlainObject(raw) || typeof raw.schemaVersion !== 'number') return raw
  if (raw.schemaVersion !== CURRENT_SCHEMA_VERSION && !LIFTABLE.includes(raw.schemaVersion)) return raw
  const lifted = raw.schemaVersion === 9
    ? liftKey(raw)
    : (JSON.parse(JSON.stringify(raw)) as Record<string, unknown>)
  if (raw.schemaVersion < ENGLISH_NAMES) {
    liftBlockNames(lifted.tree)
    liftCardsTemplate(lifted.tree)
    liftAreaTitle(lifted.tree)
    liftLegacy(lifted.tree)
    liftToEnglish(lifted)
  }
  if (raw.schemaVersion < 17) liftMissedNames(lifted.tree)
  if (raw.schemaVersion < 18) liftWithoutRooms(lifted.tree)
  if (raw.schemaVersion < 19) liftTo19(lifted)
  if (raw.schemaVersion < 20) liftTo20(lifted)
  if (raw.schemaVersion < 21) liftTo21(lifted.tree)
  if (raw.schemaVersion < 22) liftTo22(lifted.tree)
  lifted.schemaVersion = CURRENT_SCHEMA_VERSION
  return lifted
}

// ---- version 18: a kanban has columns, no rooms inside them ----

function liftWithoutRooms(x: unknown): void {
  if (!isPlainObject(x)) return
  for (const node of Object.values(x)) {
    if (!isPlainObject(node)) continue
    if (node.type === 'kanban-column' && isPlainObject(node.values)) delete node.values.groupingField
    if (!isPlainObject(node.chains)) continue
    for (const steps of Object.values(node.chains)) {
      if (!Array.isArray(steps)) continue
      for (const step of steps) {
        if (!isPlainObject(step)) continue
        for (const key of ['parameter', 'extraParameter']) {
          const list = step[key]
          if (!Array.isArray(list)) continue
          for (const binding of list) {
            if (isPlainObject(binding) && binding.source === 'context' && binding.value === 'ZIMMER') {
              binding.source = 'fixed'
              binding.value = ''
            }
          }
        }
        if (Array.isArray(step.toolParameter)) {
          step.toolParameter = step.toolParameter.map((p) => p === '{ZIMMER}' ? '' : p)
        }
      }
    }
  }
}

const COLUMN_KEYS_19: Record<string, string> = { titleByHand: 'titleTyped' }

const PAIR_KEYS_19: Record<string, string> = { ofField: 'fromField' }

const STEP_KEYS_19: Record<string, string> = { toolNr: 'toolNumber', notiz: 'note' }

const PARAMETER_SOURCES_19: Record<string, string> = {
  from: 'omitted', previous_result: 'previousResult', step_result: 'stepResult',
  block_value: 'blockValue', data_field: 'dataField',
}

const FACTOR_KINDS_19: Record<string, string> = { spalte: 'column', datenfeld: 'dataField', zahl: 'number' }

const FACTOR_KEYS_19: Record<string, string> = { feld: 'field' }

const UNITS_19: Record<string, string> = { anzahl: 'count', tag: 'day' }

const ROUNDING_KEYS_19: Record<string, string> = { spots: 'decimals' }

const ROUNDING_DIRECTIONS_19: Record<string, string> = {
  on: 'up', off: 'down', kfm: 'nearest', auf: 'up', ab: 'down',
}

const FIELD_KEYS_19: Record<string, string> = { icon: 'length' }

function word(o: Record<string, unknown>, key: string, table: Record<string, string>): void {
  const held = o[key]
  if (typeof held === 'string' && Object.hasOwn(table, held)) o[key] = table[held]
}

function liftFactor(factor: unknown): void {
  if (!isPlainObject(factor)) return
  to(factor, FACTOR_KEYS_19)
  word(factor, 'kind', FACTOR_KINDS_19)
  word(factor, 'unit', UNITS_19)
  if (!isPlainObject(factor.round)) return
  to(factor.round, ROUNDING_KEYS_19)
  word(factor.round, 'direction', ROUNDING_DIRECTIONS_19)
}

function liftCalculations(calculations: unknown): void {
  if (!Array.isArray(calculations)) return
  for (const calculation of calculations) {
    if (!isPlainObject(calculation)) continue
    liftFactor(calculation.lead)
    for (const side of ['numerator', 'denominator']) {
      const factors = calculation[side]
      if (Array.isArray(factors)) factors.forEach(liftFactor)
    }
  }
}

function liftParameterNames(params: unknown): void {
  if (!Array.isArray(params)) return
  for (const p of params) {
    if (isPlainObject(p)) word(p, 'source', PARAMETER_SOURCES_19)
  }
}

function liftChains(chains: Record<string, unknown>): void {
  for (const steps of Object.values(chains)) {
    if (!Array.isArray(steps)) continue
    for (const step of steps) {
      if (!isPlainObject(step)) continue
      to(step, STEP_KEYS_19)
      liftParameterNames(step.parameter)
      liftParameterNames(step.extraParameter)
    }
  }
}

export function liftSourceNames(state: Record<string, unknown>): void {
  const sources = state.dataSources
  if (!Array.isArray(sources)) return
  for (const source of sources) {
    if (!isPlainObject(source)) continue
    if (Array.isArray(source.fields)) renameDeep(source.fields, FIELD_KEYS_19)
    if (isPlainObject(source.getValue)) liftParameterNames(source.getValue.parameter)
  }
}

function liftTo19(state: Record<string, unknown>): void {
  const tree = state.tree
  if (isPlainObject(tree)) {
    for (const node of Object.values(tree)) {
      if (!isPlainObject(node)) continue
      const values = node.values
      if (isPlainObject(values)) {
        for (const key of ['columns', 'lookupColumns']) {
          if (Array.isArray(values[key])) renameDeep(values[key], COLUMN_KEYS_19)
        }
        for (const key of ['extraSources', 'followsSelection']) {
          if (Array.isArray(values[key])) renameDeep(values[key], PAIR_KEYS_19)
        }
        liftCalculations(values.calculations)
      }
      if (isPlainObject(node.chains)) liftChains(node.chains)
    }
  }
  liftSourceNames(state)
}

// ---- version 20: a source as preset and descriptor, not a kind with switches ----

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// The kind names the preset; what each kind allowed decides the descriptor.
function descriptorSource(source: Record<string, unknown>): Record<string, unknown> {
  if ('preset' in source || !isPresetId(source.kind)) return source
  const {
    kind, idbId, recordField, headerKeyIndex, delivery, loadRelation, getValue, area, ...kept
  } = source
  const preset = sourcePreset(kind)
  return {
    ...kept,
    preset: kind,
    tableId: preset.tableId !== '' ? preset.tableId : text(idbId),
    ...descriptorFor(preset, {
      headerKey: text(headerKeyIndex),
      area: text(area),
      openRecord: delivery === 'openRecord',
      load: checkLoadRelation(loadRelation),
      getValue: checkGetValue(getValue) ?? EMPTY_CHOICE.getValue,
      // An ERP query could not carry a record number; one left over stays unused.
      recordField: kind === 'erpQuery' ? '' : text(recordField),
    }),
  }
}

function liftToDescriptors(state: Record<string, unknown>): void {
  const sources = state.dataSources
  if (!Array.isArray(sources)) return
  state.dataSources = sources.map((source) => (isPlainObject(source) ? descriptorSource(source) : source))
}

// ---- version 20: the load relation as a catalog entry, not a number at the source ----

// What the mask filled in for every load relation, whatever number it had.
const OLD_POSITION_PARAMETER = ['BELART', 'POS', 'LEN', 'BELNR', 'JAHR', 'ARCHIV', '', 'POSNR', '', '', '', '']
const OLD_POSITION_SLOTS = [
  'documentKind', 'position', 'length', 'documentNumber', 'year', 'archive',
  'empty', 'positionNumber', 'empty', 'empty', 'empty', 'empty',
]
const OLD_ANSWER_LENGTH = 255

function positionEntryFor(nr: string, relations: unknown[]): string {
  const present = relations.find((r) => isPlainObject(r) && r.verb === 'GET_RELATION'
    && r.nr === nr && isPlainObject(r.positions) && typeof r.id === 'string')
  if (isPlainObject(present) && typeof present.id === 'string') return present.id
  let id = `positions-${nr}`
  for (let n = 2; relations.some((r) => isPlainObject(r) && r.id === id); n++) id = `positions-${nr}-${n}`
  relations.push({
    id,
    name: `Positionen holen (Relation ${nr})`,
    verb: 'GET_RELATION',
    nr,
    parameter: [...OLD_POSITION_PARAMETER],
    positions: { slots: [...OLD_POSITION_SLOTS], answerLength: OLD_ANSWER_LENGTH },
  })
  return id
}

function liftLoadRelations(state: Record<string, unknown>): void {
  const sources = state.dataSources
  if (!Array.isArray(sources)) return
  const relations: unknown[] = Array.isArray(state.relation) ? state.relation : []
  for (const source of sources) {
    if (!isPlainObject(source)) continue
    const delivery = source.delivery
    const load = isPlainObject(source.loadRelation)
      ? source.loadRelation
      : isPlainObject(delivery) && delivery.kind === 'relationRows' ? delivery : null
    if (!load || typeof load.nr !== 'string' || 'relationId' in load) continue
    const nr = load.nr.trim()
    // A load the mask could not use before stays unusable; it gets no entry.
    if (!/^\d+$/.test(nr) || !checkLoadRelation({ ...load, relationId: nr })) continue
    load.relationId = positionEntryFor(nr, relations)
    delete load.nr
  }
  if (relations.length > 0) state.relation = relations
}

// A mask before version 20, and a customer file before version 2, still
// carries its sources as kinds and its load relations as numbers.
export function liftTo20(state: Record<string, unknown>): void {
  liftLoadRelations(state)
  liftToDescriptors(state)
}

// ---- version 21: a text takes a variant, not size, weight and color; a field looks plain, not line ----

// The size a text had while it stored none.
const OLD_TEXT_SIZE = 14

// Bold becomes a title from 15 px up and a heading below, small type a label,
// muted type the muted variant. Accent and tone colors fall away: the reception
// mask does not color free text.
function textVariant(values: Record<string, unknown>): string {
  const size = typeof values.size === 'number' ? values.size : OLD_TEXT_SIZE
  if (values.weight === 'bold') return size >= 15 ? 'title' : 'heading'
  if (size <= 11.5) return 'label'
  if (values.color === 'muted') return 'muted'
  return 'body'
}

function liftTo21(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || !isPlainObject(node.values)) continue
    const values = node.values
    if (node.type === 'text') {
      values.variant = textVariant(values)
      delete values.size
      delete values.weight
      delete values.color
    }
    if (node.type === 'formfield' && values.appearance === 'line') values.appearance = 'plain'
  }
}

// ---- version 22: a field looks up as a text field with the switch on; a text field takes two lines by its height ----

function liftTo22(tree: unknown): void {
  if (!isPlainObject(tree)) return
  for (const node of Object.values(tree)) {
    if (!isPlainObject(node) || node.type !== 'formfield' || !isPlainObject(node.values)) continue
    const values = node.values
    if (values.fieldType === 'lookup') values.lookup = true
    if (values.fieldType === 'lookup' || values.fieldType === 'textarea') values.fieldType = 'text'
  }
}
