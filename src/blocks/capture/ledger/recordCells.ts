// The cells of the booked rows: per record what stands in which column. A
// record without a cell is taken out, so the size answers "is anything here".
export type Cells = Map<string, Map<number, string>>

export function cellIn(cells: Cells, record: string, column: number): string | undefined {
  return record === '' ? undefined : cells.get(record)?.get(column)
}

export function setCell(cells: Cells, record: string, column: number, value: string): boolean {
  if (record === '') return false
  const row = cells.get(record)
  if (row === undefined) {
    cells.set(record, new Map([[column, value]]))
    return true
  }
  if (row.get(column) === value) return false
  row.set(column, value)
  return true
}

export function dropCell(cells: Cells, record: string, column: number): boolean {
  const row = cells.get(record)
  if (row === undefined || !row.delete(column)) return false
  if (row.size === 0) cells.delete(record)
  return true
}

export function recordsIn(cells: Cells): string[] {
  return [...cells.keys()]
}

export function hasRecordIn(cells: Cells, record: string): boolean {
  return record !== '' && cells.has(record)
}

export function dropRecord(cells: Cells, record: string): boolean {
  return cells.delete(record)
}
