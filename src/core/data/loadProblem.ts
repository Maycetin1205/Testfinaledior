export interface EntryProblem {
  spot: string
  base: string
}

export interface LoadProblem extends EntryProblem {
  area: string
}

export const AREA_LAYOUT = 'Masken-Aufbau'
export const AREA_SOURCES = 'Datenquellen'
export const AREA_RELATION = 'Relationen'

export function withArea(
  area: string,
  problems: readonly EntryProblem[],
): LoadProblem[] {
  if (problems.length === 0) {
    return [{ area, spot: '', base: 'Angaben in diesem Bereich stimmen nicht' }]
  }
  return problems.map((p) => ({ area, spot: p.spot, base: p.base }))
}
