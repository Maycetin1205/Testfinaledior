// Befehle an SoftEngine senden: START_TOOL und BW-Link.
import { seFenster } from './bridge'

function startToolLink(nr: string, params: readonly string[]): string {
  let link = '0,START_TOOL,' + nr
  if (params.length > 0) {
    link += ',' + params.map((p) => encodeURIComponent(p)).join(',')
  }
  return link
}

// Beide Wege sagen, ob der Ruf HINAUSGING: schluckten sie den Fehler, liefe
// die Kette weiter, als stuende das Werkzeug schon.
export function sendeBwLink(befehl: string): boolean {
  const zeile = befehl.trim()
  if (zeile === '') return false
  // Genau so trennt SoftEngines sendBWLinkIntern (kontrakte.md 13).
  if (zeile.includes('START_TOOL')) return sendeStartTool(zeile.split(',')[2] ?? '', [])
  const g = seFenster()
  try {
    // SoftEngine waehlt den Weg an SEDATA.BW_PFAD; die Bruecke uebernimmt nur
    // Daten, darum zaehlt hier, ob sie selbst da ist.
    if (typeof g.basisHTML_SND_MSG === 'function') {
      g.basisHTML_SND_MSG('HTMLEVENT', { art: 'BWLINK', params: zeile })
      return true
    }
  } catch { /* nicht in SE */ }
  return false
}

// Die Nachricht traegt die Parameter, der BW-Link wirft sie weg: darum erst der
// Nachrichten-Weg und nur ohne ihn der Link.
export function sendeStartTool(nr: string, params: readonly string[]): boolean {
  if (nr.trim() === '') return false
  const g = seFenster()
  try {
    if (typeof g.basisHTML_SND_MSG === 'function') {
      const obj: Record<string, unknown> = { NR: nr }
      if (params.length > 0) obj.PARAMS = [...params]
      g.basisHTML_SND_MSG('START_TOOL', obj)
      return true
    }
  } catch { /* faellt auf den Link zurueck */ }
  try {
    if (typeof g.sendBWLinkIntern === 'function') {
      g.sendBWLinkIntern(startToolLink(nr, params))
      return true
    }
  } catch { /* nicht in SE */ }
  return false
}
