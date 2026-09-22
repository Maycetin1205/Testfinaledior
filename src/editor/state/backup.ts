import type { MessageSink } from './messages'

const BACKUP_SUFFIX = '__notfallkopie'

export function backupKeyFor(storageKey: string): string {
  return `${storageKey}${BACKUP_SUFFIX}`
}

function freeKey(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  let key = `${prefix}_${stamp}`
  for (let n = 2; localStorage.getItem(key) !== null; n++) key = `${prefix}_${stamp}_${n}`
  return key
}

export function makeCopyOn(storageKey: string, raw: string): string | null {
  try {
    const prefix = backupKeyFor(storageKey)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null && key.startsWith(prefix) && localStorage.getItem(key) === raw) return key
    }
    const key = freeKey(prefix)
    localStorage.setItem(key, raw)
    return key
  } catch {
    return null
  }
}

export interface Backup {
  key: string
  raw: string

  time: Date | null
}

function timeFrom(rest: string): Date | null {
  const parts = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/.exec(rest)
  if (parts === null) return null
  const time = new Date(`${parts[1]}T${parts[2]}:${parts[3]}:${parts[4]}.${parts[5]}Z`)
  return Number.isNaN(time.getTime()) ? null : time
}

export function allCopies(storageKey: string): Backup[] {
  try {
    const prefix = backupKeyFor(storageKey)
    const found: Backup[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key === null || !key.startsWith(prefix)) continue
      const raw = localStorage.getItem(key)
      if (raw === null) continue
      found.push({ key: key, raw, time: timeFrom(key.slice(prefix.length + 1)) })
    }
    return found.sort((a, b) => {
      if (a.key === b.key) return 0
      return a.key < b.key ? 1 : -1
    })
  } catch {
    return []
  }
}

export function copyRecord(storageKey: string, backupKey: string | null): string {
  if (backupKey !== null) {
    return `Der alte Stand ist als Notfallkopie gesichert (Schlüssel „${backupKey}" im `
      + 'Browser-Speicher). Die Kopie bleibt erhalten, bis sie gerettet oder bewusst '
      + 'entfernt wird.'
  }
  return 'Eine Notfallkopie ließ sich NICHT anlegen — der Browser-Speicher nahm sie nicht '
    + `an. Der alte Stand liegt noch unter „${storageKey}", bis der Editor das nächste Mal `
    + 'speichert. Wer ihn retten will, sichert ihn jetzt von Hand.'
}

export function saveUnreadable(
  storageKey: string,
  raw: string,
  name: string,
  sink: MessageSink,
): void {
  const backupKey = makeCopyOn(storageKey, raw)
  sink.report(
    `Der gespeicherte Stand „${name}" war beschädigt und konnte nicht `
    + `gelesen werden.\n${copyRecord(storageKey, backupKey)}\n`
    + 'Es geht vorerst ohne diesen Stand weiter.',
  )
}

const reported = new Set<string>()

export function rememberStorageSuccess(storageKey: string): void {
  reported.delete(storageKey)
}

export function reportStorageFailure(
  storageKey: string,
  name: string,
  error: unknown,
  sink: MessageSink,
): void {
  console.warn(`Speichern fehlgeschlagen (${name})`, error)
  if (reported.has(storageKey)) return
  reported.add(storageKey)
  sink.report(
    `„${name}" konnte nicht im Browser gespeichert werden.\n\n`
    + 'Das heißt: Änderungen von jetzt an sind beim Schließen des Fensters '
    + 'verloren. Der Editor läuft weiter, aber ohne Sicherung.\n\n'
    + 'Was hilft: mit „Speichern“ eine Maskendatei herunterladen, damit die Arbeit als Datei '
    + 'vorliegt — und Speicherplatz des Browsers freiräumen. Gelingt das '
    + 'Speichern wieder, meldet sich der Editor erst bei der nächsten '
    + 'Störung erneut.',
  )
}
