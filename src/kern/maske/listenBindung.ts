// Der Vertrag fuer Bausteine mit einer Liste von Eintraegen (Spalten, Fensterspalten).
import { zerlegeBindung } from './bindung'

export interface ListenBindung {
  prop: string

  titelSchluessel: string

  feldSchluessel: string

  // Gesetzt: jeder Eintrag traegt hier eine dauerhafte Kennung, und Ketten und
  // Formulare zeigen auf SIE statt auf den Platz, der beim Loeschen verrutscht.
  kennungSchluessel?: string

  standardTitel: string

  // Gesetzt: die Feld-Auswahl liest NUR die Quelle, deren id in dieser
  // Eigenschaft steht, nicht die Quellen in Reichweite.
  quelleProp?: string

  eintragsSchalter?: readonly EintragsSchalter[]

  eintragsFeldWahl?: readonly EintragsFeldWahl[]

  // Editier-Vorgaenge als reine Funktionen ueber den Props: sie geben die
  // geaenderten Props zurueck, leer heisst nicht erlaubt.
  eintragNeu?: (props: Readonly<Record<string, unknown>>) => Record<string, unknown>
  eintragWeg?: (props: Readonly<Record<string, unknown>>, index: number) => Record<string, unknown>
  eintragVerschieben?: (
    props: Readonly<Record<string, unknown>>,
    von: number,
    nach: number,
  ) => Record<string, unknown>

  // CSS-Auswahl der Stellen, an denen der Editor die Eintraege anfasst. Er legt
  // seine Bedienung darueber; der Baustein zeichnet dafuer nichts.
  eintragStellen?: string
}

// Ein ZWEITES Feld je Eintrag: die Spalte zeigt und schreibt das Feld der
// Hauptquelle, das Fuellfeld holt den Wert beim Erfassen aus einer Hilfsquelle.
// `nurFremdeQuellen` haelt die Wahl bei den Hilfsquellen.
export interface EintragsFeldWahl {
  schluessel: string

  name: string

  hinweis?: string

  nurFremdeQuellen?: boolean
}

export interface EintragsSchalter {
  schluessel: string

  name: string

  // Gespeichert wird nur die ABWEICHUNG davon, sonst stuende in jedem Eintrag
  // derselbe Wert.
  standard?: boolean

  // Gilt nur, solange das Feld zur EIGENEN Quelle gehoert: eine Vormerkung laeuft
  // ueber die Satznummer der Hauptquellen-Zeile, ein fremdes Feld waere ein
  // falsches Schreibziel.
  nurEigeneQuelle?: boolean

  // Ein Wort fuer die zugeklappte Kopfzeile; ohne es merkt niemand, dass hinter
  // dem Pfeil etwas vom Standard abweicht.
  kurz?: string
}

export function schalterAn(
  schalter: EintragsSchalter,
  eintrag: Record<string, unknown>,
): boolean {
  const wert = eintrag[schalter.schluessel]
  return typeof wert === 'boolean' ? wert : schalter.standard === true
}

// Die EINE Stelle dafuer: das Kopf-Fenster zeichnet danach, die Tabelle
// entscheidet danach ueber das Tippen, der Export ueber die Adressierbarkeit und
// darueber, was vom Schalterwert erhalten bleibt.
export function schalterFuer(
  b: ListenBindung,
  eintrag: Record<string, unknown>,
): readonly EintragsSchalter[] {
  const feld = eintrag[b.feldSchluessel]
  const ausFremderQuelle = typeof feld === 'string'
    && zerlegeBindung(feld).quelleId !== ''
  return (b.eintragsSchalter ?? [])
    .filter((s) => !(s.nurEigeneQuelle === true && ausFremderQuelle))
}

// EINE Stelle fuer beide Leser: das Kopf-Fenster zeichnet danach, der Export
// bestellt danach die Felder der Hilfsquelle.
export function feldWahlenLesen(
  b: ListenBindung,
  eintrag: Record<string, unknown>,
): { wahl: EintragsFeldWahl; wert: string }[] {
  return (b.eintragsFeldWahl ?? []).map((wahl) => {
    const roh = eintrag[wahl.schluessel]
    return { wahl, wert: typeof roh === 'string' ? roh : '' }
  })
}

export function listenStandardTitel(b: ListenBindung, index: number): string {
  return b.standardTitel.replace('{n}', String(index + 1))
}

export function listeLesen(roh: unknown, b: ListenBindung): Record<string, unknown>[] {
  if (!Array.isArray(roh)) return []
  return roh.map((x, i) => {
    if (x && typeof x === 'object') return { ...(x as Record<string, unknown>) }
    return {
      [b.titelSchluessel]: typeof x === 'string' ? x : listenStandardTitel(b, i),
      [b.feldSchluessel]: '',
    }
  })
}

// Ein Schluessel, der nur unter einer Bedingung in den Export gehoert.
interface BedingterSchluessel {
  key: string
  erlaubt: (eintrag: Record<string, unknown>) => boolean
}

function bedingteSchluessel(b: ListenBindung): BedingterSchluessel[] {
  const regeln: BedingterSchluessel[] = []
  for (const schalter of b.eintragsSchalter ?? []) {
  // Behalten wird ein Schalterwert nur, wenn er sichtbar ist UND vom Standard
  // abweicht.
    regeln.push({
      key: schalter.schluessel,
      erlaubt: (e) => schalterFuer(b, e).includes(schalter)
        && schalterAn(schalter, e) !== (schalter.standard === true),
    })
  }
  return regeln
}

// Die EINE Stelle, die Eintrags-Kennungen vergibt. Bestehende bleiben
// unangetastet, an ihnen haengen Ketten-Parameter und Rechnung. Neue Kennung ist
// die HOECHSTE plus 1, nie die niedrigste Luecke: eine neu vergebene Nummer
// liesse alte Zeiger stumm auf die frische Spalte zeigen.
export function kennungenVergeben(vorhanden: readonly string[]): string[] {
  const vergeben = new Set<string>()
  for (const roh of vorhanden) {
    const k = roh.trim()
    if (k !== '') vergeben.add(k)
  }
  let naechste = 1
  for (const k of vergeben) {
    const treffer = /^s(\d+)$/.exec(k)
    if (treffer) naechste = Math.max(naechste, Number(treffer[1]) + 1)
  }
  const behalten = new Set<string>()
  return vorhanden.map((roh) => {
    const k = roh.trim()
    if (k !== '' && !behalten.has(k)) {
      behalten.add(k)
      return k
    }
    while (vergeben.has(`s${naechste}`)) naechste += 1
    const neu = `s${naechste}`
    vergeben.add(neu)
    behalten.add(neu)
    return neu
  })
}

export function listeFuerExport(roh: unknown, b: ListenBindung): unknown {
  if (!Array.isArray(roh)) return roh
  const regeln = bedingteSchluessel(b)
  if (regeln.length === 0) return roh
  return roh.map((x) => {
    if (!x || typeof x !== 'object') return x
    const eintrag = x as Record<string, unknown>
    const weg = regeln
      .filter((r) => r.key in eintrag && !r.erlaubt(eintrag))
      .map((r) => r.key)
    if (weg.length === 0) return x
    const kopie = { ...eintrag }
    for (const k of weg) delete kopie[k]
    return kopie
  })
}
