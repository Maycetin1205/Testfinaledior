// Welche Abschnitte des Inspectors aufgeklappt sind — eine Voreinstellung des Arbeitsplatzes.
import { useCallback, useEffect, useState } from 'react'

// Der Stand geht nicht in den Baum, nicht in die Historie und nicht in den
// Export, darum ein eigener Schluessel.
const SCHLUESSEL = 'aufbau_editor_inspector_abschnitte'

// Der Name ist der Schluessel im Speicher und gilt fuer ALLE Bausteine.
export type AbschnittName =
  | 'datenquellen'
  | 'felder'
  | 'suchfenster'
  | 'auswahlFolgen'
  | 'aktionen'

// Zugeklappt ist die Vorgabe: offen ist der Inspector einer Tabelle laenger als
// das Fenster.
const VORGABE = false

function lese(): Record<string, boolean> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const roh = localStorage.getItem(SCHLUESSEL)
    if (roh === null) return {}
    const wert: unknown = JSON.parse(roh)
    if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) return {}

  // Fremde oder alte Eintraege fliegen still raus: ein kaputter Speicher darf den
  // Inspector nicht mitreissen.
    const stand: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(wert)) {
      if (typeof v === 'boolean') stand[k] = v
    }
    return stand
  } catch {
    // Speicher gesperrt oder kaputtes JSON — dann eben jedes Mal die Vorgabe.
    return {}
  }
}

// Der Stand liegt WAEHREND der Sitzung im Speicher des Fensters; der
// Browserspeicher ist nur sein Gedaechtnis ueber die Sitzung hinaus. Sonst
// oeffnete `oeffneAbschnitt` nichts, wo der Speicher gesperrt ist.
let stand: Record<string, boolean> | null = null

function alle(): Record<string, boolean> {
  if (stand === null) stand = lese()
  return stand
}

const horcher = new Set<() => void>()

function setze(name: AbschnittName, offen: boolean): void {
  alle()[name] = offen
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(alle()))
    }
  } catch {
  // Nicht merken zu koennen ist kein Grund, das Zuklappen scheitern zu lassen.
  }
  for (const melde of [...horcher]) melde()
}

// Von aussen aufmachen: die Lupe am Baustein und der Knopf am Spaltenkopf
// zeigen auf ihren Abschnitt, statt ein eigenes Fenster zu bauen.
export function oeffneAbschnitt(name: AbschnittName): void {
  setze(name, true)
}

// Liefert den Stand eines Abschnitts und den Schalter dazu.
export function useAbschnitt(name: AbschnittName): [boolean, (offen: boolean) => void] {
  const [offen, setOffen] = useState<boolean>(() => alle()[name] ?? VORGABE)

  useEffect(() => {
    const melde = (): void => setOffen(alle()[name] ?? VORGABE)
    horcher.add(melde)
    melde()
    return () => {
      horcher.delete(melde)
    }
  }, [name])

  const schalte = useCallback((neu: boolean) => setze(name, neu), [name])

  return [offen, schalte]
}
