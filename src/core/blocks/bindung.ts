// Die Form einer Feldbindung: „Feldcode" heisst die eigene Quelle,
// „quelleId::Feldcode" eine andere. Eigene Datei, weil ein Import aus
// der Bausteinart ein Ringschluss waere.

export const QUELLEN_TRENNER = '::'

export interface FeldZiel {
  quelleId: string
  code: string
}

export function bindungMitQuelle(quelleId: string, code: string): string {
  if (quelleId === '' || code === '') return code
  return `${quelleId}${QUELLEN_TRENNER}${code}`
}

export function zerlegeBindung(wert: string): FeldZiel {
  const teile = wert.split(QUELLEN_TRENNER)
  if (teile.length !== 2) return { quelleId: '', code: wert }
  const [quelleId, code] = teile
  if (quelleId === '' || code === '') return { quelleId: '', code: wert }
  return { quelleId, code }
}
