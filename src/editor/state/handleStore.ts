// What the browser keeps of the folders picked on disk: the folder of the
// masks and the folders exports go to. A folder can only be kept as itself,
// not as text, and only IndexedDB takes it; localStorage does not.
const DB_NAME = 'aufbau_editor'
const STORE = 'handles'

function opened(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB öffnet nicht'))
  })
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB antwortet nicht'))
  })
}

// What is kept under the key, or null; a blocked store keeps nothing.
export async function keptHandle<T>(key: string): Promise<T | null> {
  try {
    const db = await opened()
    try {
      const value = await done(db.transaction(STORE).objectStore(STORE).get(key)) as T | undefined
      return value ?? null
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

// Not keeping it is no reason to fail: the folder is then asked for again
// after the next start.
export async function keepHandle(key: string, value: unknown): Promise<void> {
  try {
    const db = await opened()
    try {
      await done(db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key))
    } finally {
      db.close()
    }
  } catch {
    // Browser storage can be blocked.
  }
}
