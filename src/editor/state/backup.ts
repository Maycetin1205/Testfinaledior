const BACKUP_SUFFIX = '__notfallkopie'

function backupKeyFor(storageKey: string): string {
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
