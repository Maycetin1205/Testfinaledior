// Das eine Berechnungsfenster, das im Editor offen ist. Aufgemacht wird es an
// der Leiste des Bausteins und im Spaltenkopf; gezeichnet wird es von der
// Shell, darum eine Anmeldestelle statt eines Zustands im BlockHost.
let offen: string | null = null
const horcher = new Set<() => void>()

function melde(neu: string | null): void {
  offen = neu
  for (const fn of [...horcher]) fn()
}

export function oeffneBerechnungenFenster(blockId: string): void {
  melde(blockId)
}

export function schliesseBerechnungenFenster(): void {
  if (offen !== null) melde(null)
}

export function offenesBerechnungenFenster(): string | null {
  return offen
}

export function beiBerechnungenWechsel(fn: () => void): () => void {
  horcher.add(fn)
  return () => {
    horcher.delete(fn)
  }
}
