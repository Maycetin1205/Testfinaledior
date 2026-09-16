// Die Version des Masken-Aufbaus und die Hebung der letzten alten Staende.
export const CURRENT_SCHEMA_VERSION = 13

// Format 9 trug die englischen Schluessel (type, props, kind, params ...),
// Format 10 an den Bausteinen noch source, tagField und die on...-Ereignisse,
// Format 11 am Formularfeld noch fieldType, placeholder, options und value,
// Format 12 an der Schaltflaeche noch label.
const HEBBAR = [9, 10, 11, 12]

export function schemaLesbar(version: unknown): version is number {
  return version === CURRENT_SCHEMA_VERSION
}

function objekt(wert: unknown): wert is Record<string, unknown> {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert)
}

function um(o: Record<string, unknown>, paare: Record<string, string>): void {
  for (const [alt, neu] of Object.entries(paare)) {
    if (alt in o && !(neu in o)) {
      o[neu] = o[alt]
      delete o[alt]
    }
  }
}

// Erkennt jeden Gegenstand an seinen Schluesseln, nicht an seinem Platz: so
// gilt dieselbe Hebung fuer den Baum, die Bibliothek und eine Bibliotheksdatei.
function hebeGegenstand(x: unknown): void {
  if (Array.isArray(x)) { x.forEach(hebeGegenstand); return }
  if (!objekt(x)) return
  if ('childIds' in x) um(x, { type: 'typ', props: 'werte', events: 'ketten', parentId: 'elternId', childIds: 'kinderIds' })
  if ('resultKey' in x) um(x, { type: 'art', resultKey: 'ergebnisName', params: 'parameter', extraParams: 'zusatzParameter', toolParams: 'toolParameter' })
  if ('source' in x && 'value' in x && !('id' in x)) um(x, { source: 'quelle', value: 'wert', dataSourceId: 'quelleId', blockId: 'bausteinId' })
  if ('kind' in x && 'fields' in x) um(x, { kind: 'art', fields: 'felder', indexField: 'satzFeld' })
  if ('code' in x && 'label' in x) um(x, { label: 'name' })
  if ('verb' in x && 'params' in x) um(x, { params: 'parameter', allowExtraParams: 'zusatzParameterErlaubt' })
  if ('relationId' in x && 'params' in x) um(x, { params: 'parameter' })
  if ('fromField' in x) um(x, { fromField: 'vonFeld', toField: 'nachFeld' })
  if ('keyPairs' in x) um(x, { keyPairs: 'paare' })
  for (const wert of Object.values(x)) hebeGegenstand(wert)
}

// Eine Kopie mit den heutigen Schluesseln; das Original bleibt unberuehrt.
export function hebeSchluessel<T>(roh: T): T {
  const kopie = JSON.parse(JSON.stringify(roh)) as T
  hebeGegenstand(kopie)
  return kopie
}

// Die Bausteine des Baums, erkannt an typ und werte: die umbenannten
// Eigenschaften und Ereignisse eines Bausteins, den Editor und Maske heute
// deutsch nennen.
function hebeBausteinNamen(x: unknown): void {
  if (!objekt(x)) return
  for (const node of Object.values(x)) {
    if (!objekt(node) || typeof node.typ !== 'string' || !objekt(node.werte)) continue
    um(node.werte, { source: 'quelle', tagField: 'tagFeld' })
    // Nur am Formularfeld: `value`, `options` und `placeholder` heissen an
    // anderen Bausteinen etwas anderes.
    if (node.typ === 'formfeld') {
      um(node.werte, {
        fieldType: 'feldTyp',
        placeholder: 'beschriftung',
        options: 'optionen',
        value: 'wert',
        valueField: 'wertField',
      })
    }
    // Nur an der Schaltflaeche: sie ist der einzige Baustein, dessen
    // Beschriftung `label` hiess.
    if (node.typ === 'button') um(node.werte, { label: 'beschriftung' })
    if (objekt(node.ketten)) {
      um(node.ketten, { onRowClick: 'zeileGewaehlt', onRowDblClick: 'zeileDoppelt', onF4: 'tasteF4' })
    }
  }
}

// Ein Ketten-Parameter, der neben `wert` noch das alte `value` traegt (ein
// frueherer Editor schrieb beide): das Doppel ist kein Inhalt und faellt weg,
// sonst lehnte der Lader die ganze Maske als Verlust ab.
function hebeAltlasten(x: unknown): void {
  if (Array.isArray(x)) { x.forEach(hebeAltlasten); return }
  if (!objekt(x)) return
  if ('quelle' in x && 'wert' in x && 'value' in x && x.value === x.wert) delete x.value
  for (const wert of Object.values(x)) hebeAltlasten(wert)
}

// Ein gespeicherter oder gelesener Maskenstand: die hebbaren Formate kommen auf
// den heutigen Stand, alles andere kommt unveraendert zurueck und faellt bei
// schemaLesbar auf.
export function hebeStand(roh: unknown): unknown {
  if (!objekt(roh) || typeof roh.schemaVersion !== 'number' || !HEBBAR.includes(roh.schemaVersion)) return roh
  const gehoben = roh.schemaVersion === 9 ? hebeSchluessel(roh) : (JSON.parse(JSON.stringify(roh)) as Record<string, unknown>)
  hebeBausteinNamen(gehoben.tree)
  hebeAltlasten(gehoben.tree)
  gehoben.schemaVersion = CURRENT_SCHEMA_VERSION
  return gehoben
}

// Bausteintypen, die es nicht mehr gibt. Eine Maske mit ihnen wird nicht
// abgelehnt: die Bausteine fallen samt Kindern weg, und der Lader sagt es.
export const ENTFALLENE_TYPEN: readonly string[] = ['navi', 'navi-eintrag', 'ansicht']

export function ohneEntfallene(
  tree: Record<string, unknown>,
): { tree: Record<string, unknown>; entfallen: string[] } {
  const weg = new Set<string>()
  const merke = (id: string): void => {
    const node = tree[id]
    if (!objekt(node) || weg.has(id)) return
    weg.add(id)
    for (const kind of Array.isArray(node.kinderIds) ? node.kinderIds : []) {
      if (typeof kind === 'string') merke(kind)
    }
  }
  const entfallen: string[] = []
  for (const [id, node] of Object.entries(tree)) {
    if (objekt(node) && typeof node.typ === 'string' && ENTFALLENE_TYPEN.includes(node.typ)) {
      entfallen.push(node.typ)
      merke(id)
    }
  }
  if (weg.size === 0) return { tree, entfallen }
  const raus: Record<string, unknown> = {}
  for (const [id, node] of Object.entries(tree)) {
    if (weg.has(id) || !objekt(node)) continue
    raus[id] = Array.isArray(node.kinderIds)
      ? { ...node, kinderIds: node.kinderIds.filter((k) => typeof k !== 'string' || !weg.has(k)) }
      : node
  }
  return { tree: raus, entfallen }
}
