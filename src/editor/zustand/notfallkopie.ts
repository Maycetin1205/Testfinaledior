// Bevor ein beschaedigter Stand ueberschrieben wird: eine Kopie im Browserspeicher.
import { meldungen } from './meldungen'

const BACKUP_SUFFIX = '__notfallkopie'

export function backupKeyFor(storageKey: string): string {
  return `${storageKey}${BACKUP_SUFFIX}`
}

function freierSchluessel(praefix: string): string {
  const stempel = new Date().toISOString().replace(/[:.]/g, '-')
  let key = `${praefix}_${stempel}`
  for (let n = 2; localStorage.getItem(key) !== null; n++) key = `${praefix}_${stempel}_${n}`
  return key
}

// Jede Beschaedigung bekommt ihre EIGENE Kopie; denselben Inhalt legt der Editor
// nur einmal ab, sonst fuellt jeder Neustart den Speicher. null heisst, es konnte
// nichts gesichert werden — dann darf keine Meldung „gesichert" behaupten.
export function legeKopieAn(storageKey: string, raw: string): string | null {
  try {
    const praefix = backupKeyFor(storageKey)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null && key.startsWith(praefix) && localStorage.getItem(key) === raw) return key
    }
    const key = freierSchluessel(praefix)
    localStorage.setItem(key, raw)
    return key
  } catch {
    return null
  }
}

export function kopieSatz(storageKey: string, backupKey: string | null): string {
  if (backupKey !== null) {
    return `Der alte Stand ist als Notfallkopie gesichert (Schlüssel „${backupKey}" im `
      + 'Browser-Speicher). Die Kopie bleibt erhalten, bis sie gerettet oder bewusst '
      + 'entfernt wird.'
  }
  return 'Eine Notfallkopie ließ sich NICHT anlegen — der Browser-Speicher nahm sie nicht '
    + `an. Der alte Stand liegt noch unter „${storageKey}", bis der Editor das nächste Mal `
    + 'speichert. Wer ihn retten will, sichert ihn jetzt von Hand.'
}

export function sichereUnlesbaren(
  storageKey: string,
  raw: string,
  bezeichnung: string,
): void {
  const backupKey = legeKopieAn(storageKey, raw)
  meldungen.melde(
    `Der gespeicherte Stand „${bezeichnung}" war beschädigt und konnte nicht `
    + `gelesen werden.\n${kopieSatz(storageKey, backupKey)}\n`
    + 'Es geht vorerst ohne diesen Stand weiter.',
  )
}

const gemeldet = new Set<string>()

export function merkeSpeicherErfolg(storageKey: string): void {
  gemeldet.delete(storageKey)
}

export function meldeSpeicherPanne(
  storageKey: string,
  bezeichnung: string,
  fehler: unknown,
): void {
  console.warn(`Speichern fehlgeschlagen (${bezeichnung})`, fehler)
  if (gemeldet.has(storageKey)) return
  gemeldet.add(storageKey)
  meldungen.melde(
    `„${bezeichnung}" konnte nicht im Browser gespeichert werden.\n\n`
    + 'Das heißt: Änderungen von jetzt an sind beim Schließen des Fensters '
    + 'verloren. Der Editor läuft weiter, aber ohne Sicherung.\n\n'
    + 'Was hilft: mit „Speichern“ eine Maskendatei herunterladen, damit die Arbeit als Datei '
    + 'vorliegt — und Speicherplatz des Browsers freiräumen. Gelingt das '
    + 'Speichern wieder, meldet sich der Editor erst bei der nächsten '
    + 'Störung erneut.',
  )
}
