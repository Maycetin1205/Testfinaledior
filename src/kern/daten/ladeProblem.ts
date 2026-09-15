// Die Form einer Fundstelle beim Laden oder Pruefen einer Maske.
export interface EintragProblem {
  stelle: string
  grund: string
}

export interface LadeProblem extends EintragProblem {
  bereich: string
}

export const BEREICH_AUFBAU = 'Masken-Aufbau'
export const BEREICH_QUELLEN = 'Datenquellen'
export const BEREICH_RELATIONEN = 'Relationen'

export function mitBereich(
  bereich: string,
  probleme: readonly EintragProblem[],
): LadeProblem[] {
  if (probleme.length === 0) {
    return [{ bereich, stelle: '', grund: 'Angaben in diesem Bereich stimmen nicht' }]
  }
  return probleme.map((p) => ({ bereich, stelle: p.stelle, grund: p.grund }))
}
