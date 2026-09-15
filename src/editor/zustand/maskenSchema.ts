// Die Version des Masken-Aufbaus und die Hebung des letzten alten Stands.
export const CURRENT_SCHEMA_VERSION = 10

// Format 9 trug die englischen Schluessel (type, props, kind, params ...).
const HEBBAR = 9

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

// Ein gespeicherter oder gelesener Maskenstand: Format 9 wird auf 10 gehoben,
// alles andere kommt unveraendert zurueck und faellt bei schemaLesbar auf.
export function hebeStand(roh: unknown): unknown {
  if (!objekt(roh) || roh.schemaVersion !== HEBBAR) return roh
  const gehoben = hebeSchluessel(roh)
  gehoben.schemaVersion = CURRENT_SCHEMA_VERSION
  return gehoben
}
