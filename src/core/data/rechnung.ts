// Die Rechnung der Erfassungszeile: je Spalte eine Formel aus anderen Spalten und festen Zahlen.

export type RundungsRichtung = 'auf' | 'ab' | 'kfm'

export interface Rundung {
  stellen: number
  richtung: RundungsRichtung
}

export type Rechenzeichen = '+' | '-' | '*' | '/'

export const RECHENZEICHEN: readonly Rechenzeichen[] = ['+', '-', '*', '/']

// Ein Glied zeigt ueber die dauerhafte KENNUNG auf eine Spalte, nie ueber Platz
// oder Belegfeld, oder es ist eine feste Zahl.
export type Glied = { spalte: string } | { zahl: number }

export interface Formel {
  glieder: readonly Glied[]
  // Zwischen je zwei Gliedern eines, also eins weniger als Glieder.
  zeichen: readonly Rechenzeichen[]
  runden: Rundung
}

export const RUNDEN_STANDARD: Rundung = { stellen: 3, richtung: 'kfm' }

export const STELLEN_MAX = 6

export function neueFormel(): Formel {
  return { glieder: [{ spalte: '' }], zeichen: [], runden: { ...RUNDEN_STANDARD } }
}

// Getippte Zahl, deutsch und STRENG: '0.750' bleibt ungelesen, denn raten hiesse
// hier Faktor 1000.
const STRENG = /^-?\d+(,\d+)?$|^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/

export function zahlStreng(text: string): number | null {
  const t = text.trim()
  if (t === '' || !STRENG.test(t)) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function rundeWert(wert: number, runden: Rundung): number {
  const f = Math.pow(10, Math.max(0, runden.stellen))
  const x = wert * f
  // Epsilon gegen Gleitkomma-Reste: 9.000000001 darf nicht auf 10 aufrunden.
  const grob = runden.richtung === 'auf'
    ? Math.ceil(x - 1e-9)
    : runden.richtung === 'ab' ? Math.floor(x + 1e-9) : Math.round(x)
  return grob / f
}

// Gerechnete Werte reisen ohne Tausender-Gruppierung, so liest jeder Parser sie
// eindeutig zurueck.
export function zahlText(wert: number, stellen: number): string {
  return wert.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, stellen),
  })
}

// Mal und Geteilt vor Plus und Minus, wie auf dem Papier. Fehlt ein Glied oder
// wird durch null geteilt, gibt es keinen Wert.
export function rechneFormel(
  formel: Formel,
  zahlVon: (kennung: string) => number | null,
): number | null {
  if (formel.glieder.length === 0) return null
  const werte: number[] = []
  for (const glied of formel.glieder) {
    const wert = 'zahl' in glied ? glied.zahl : zahlVon(glied.spalte)
    if (wert === null || !Number.isFinite(wert)) return null
    werte.push(wert)
  }
  const summanden: number[] = []
  const vorzeichen: ('+' | '-')[] = []
  let produkt = werte[0]
  for (let i = 0; i < formel.zeichen.length && i + 1 < werte.length; i++) {
    const zeichen = formel.zeichen[i]
    const wert = werte[i + 1]
    if (zeichen === '*') produkt *= wert
    else if (zeichen === '/') {
      if (wert === 0) return null
      produkt /= wert
    } else {
      summanden.push(produkt)
      vorzeichen.push(zeichen)
      produkt = wert
    }
  }
  summanden.push(produkt)
  let ergebnis = summanden[0]
  for (let i = 0; i < vorzeichen.length; i++) {
    ergebnis = vorzeichen[i] === '+' ? ergebnis + summanden[i + 1] : ergebnis - summanden[i + 1]
  }
  if (!Number.isFinite(ergebnis)) return null
  return rundeWert(ergebnis, formel.runden)
}

const ZEICHEN_TEXT: Record<Rechenzeichen, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

// Die Formel, wie der Bauer sie liest: Spaltentitel und Zahlen mit Zeichen dazwischen.
export function formelAlsText(formel: Formel, titelVon: (kennung: string) => string): string {
  return formel.glieder.map((glied, i) => {
    const text = 'zahl' in glied
      ? zahlText(glied.zahl, STELLEN_MAX)
      : (titelVon(glied.spalte) || '?')
    return i === 0 ? text : `${ZEICHEN_TEXT[formel.zeichen[i - 1] ?? '*']} ${text}`
  }).join(' ')
}

function alsRundung(roh: unknown): Rundung {
  if (!roh || typeof roh !== 'object') return { ...RUNDEN_STANDARD }
  const o = roh as Record<string, unknown>
  const stellen = typeof o.stellen === 'number'
    && Number.isInteger(o.stellen) && o.stellen >= 0 && o.stellen <= STELLEN_MAX
    ? o.stellen
    : RUNDEN_STANDARD.stellen
  const richtung = o.richtung === 'auf' || o.richtung === 'ab' || o.richtung === 'kfm'
    ? o.richtung
    : RUNDEN_STANDARD.richtung
  return { stellen, richtung }
}

function alsGlied(roh: unknown): Glied | null {
  if (!roh || typeof roh !== 'object') return null
  const o = roh as Record<string, unknown>
  if (typeof o.zahl === 'number' && Number.isFinite(o.zahl)) return { zahl: o.zahl }
  if (typeof o.spalte === 'string') return { spalte: o.spalte.trim() }
  return null
}

function istZeichen(roh: unknown): roh is Rechenzeichen {
  return RECHENZEICHEN.includes(roh as Rechenzeichen)
}

// undefined, wenn keine brauchbare Formel dasteht.
export function formelVonRoh(roh: unknown): Formel | undefined {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return undefined
  const o = roh as Record<string, unknown>
  if (!Array.isArray(o.glieder) || !Array.isArray(o.zeichen)) return undefined
  const glieder = o.glieder.map(alsGlied)
  if (glieder.length === 0 || glieder.some((g) => g === null)) return undefined
  if (o.zeichen.length !== glieder.length - 1 || !o.zeichen.every(istZeichen)) return undefined
  return {
    glieder: glieder as Glied[],
    zeichen: [...o.zeichen],
    runden: alsRundung(o.runden),
  }
}
