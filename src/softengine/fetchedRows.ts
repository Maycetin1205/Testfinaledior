const storage = new Map<string, unknown[]>()

export function setFetchedRows(alias: string, rows: unknown[]): void {
  if (alias === '') return
  storage.set(alias, rows)
}

export function fetchedRowsFor(alias: string): unknown[] | undefined {
  return storage.get(alias)
}

export function setFetchedRowsBack(): void {
  storage.clear()
}
