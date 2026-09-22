// Lifts a saved mask to the format this editor reads. Version 16 renamed every
// stored name from German to English, version 17 the names that rename missed;
// a file below them first runs the older steps.
export const CURRENT_SCHEMA_VERSION = 17

const ENGLISH_NAMES = 16

const LIFTABLE = [9, 10, 11, 12, 13, 14, 15, 16]

export function schemaReadable(version: unknown): version is number {
  return version === CURRENT_SCHEMA_VERSION
}

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

const OLD_LINE_STYLES: Record<string, string> = {
  solid: 'durchgezogen',
  dashed: 'gestrichelt',
  dotted: 'gepunktet',
}

function liftLineStyle(x: unknown): void {
  if (!isPlainObject(x)) return
  for (const node of Object.values(x)) {
    if (!isPlainObject(node) || node.typ !== 'trenner' || !isPlainObject(node.werte)) continue
    const old = node.werte.stil
    if (typeof old === 'string' && old in OLD_LINE_STYLES) node.werte.stil = OLD_LINE_STYLES[old]
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
  trenner: 'divider',
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
  divider: { richtung: 'direction', stil: 'lineStyle', staerke: 'thickness', farbe: 'color' },
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
  divider: {
    direction: { waagerecht: 'horizontal', senkrecht: 'vertical' },
    lineStyle: { durchgezogen: 'solid', gestrichelt: 'dashed', gepunktet: 'dotted' },
    color: { linie: 'line', dezent: 'quiet', dunkel: 'dark', akzent: 'accent' },
  },
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
    liftLineStyle(lifted.tree)
    liftCardsTemplate(lifted.tree)
    liftAreaTitle(lifted.tree)
    liftLegacy(lifted.tree)
    liftToEnglish(lifted)
  }
  if (raw.schemaVersion < CURRENT_SCHEMA_VERSION) liftMissedNames(lifted.tree)
  lifted.schemaVersion = CURRENT_SCHEMA_VERSION
  return lifted
}

export const DROPPED_TYPES: readonly string[] = ['navi', 'navi-eintrag', 'ansicht', 'view']

export function withoutDropped(
  tree: Record<string, unknown>,
): { tree: Record<string, unknown>; dropped: string[] } {
  const away = new Set<string>()
  const remember = (id: string): void => {
    const node = tree[id]
    if (!isPlainObject(node) || away.has(id)) return
    away.add(id)
    for (const child of Array.isArray(node.childIds) ? node.childIds : []) {
      if (typeof child === 'string') remember(child)
    }
  }
  const dropped: string[] = []
  for (const [id, node] of Object.entries(tree)) {
    if (isPlainObject(node) && typeof node.type === 'string' && DROPPED_TYPES.includes(node.type)) {
      dropped.push(node.type)
      remember(id)
    }
  }
  if (away.size === 0) return { tree, dropped }
  const out: Record<string, unknown> = {}
  for (const [id, node] of Object.entries(tree)) {
    if (away.has(id) || !isPlainObject(node)) continue
    out[id] = Array.isArray(node.childIds)
      ? { ...node, childIds: node.childIds.filter((k) => typeof k !== 'string' || !away.has(k)) }
      : node
  }
  return { tree: out, dropped }
}
