// Liest die Feldbeschreibung einer ERP-Maske, wie SoftEngine sie liefert
// (kontrakte.md 7a): aus `Daten.Masken.<ALIAS>` wird die Feldliste einer
// Datenquelle. Von Hand abtippen waere sonst der einzige Weg — die Beschreibung
// entsteht erst im ERP, der Editor im Browser kennt sie nicht.
import { ZEICHEN_MAX, type Datenfeld } from './datenquellen'

export interface MaskenEinlesung {
  // Die Maskennummer als Feld-Vorsatz ('1211S5OPT01_'): so bleiben die Codes
  // der Felder kurz (`11_8`) und die Zeilen zeigen Position und Laenge.
  vorsatz: string

  felder: Datenfeld[]

  // Felder, die nur angezeigt werden (Status 'A'). Sie stehen mit in der Liste;
  // die Zahl sagt dem Bediener, wie viele davon nichts annehmen.
  nurAnzeige: number

  // Eintraege ohne lesbaren Namen. Stillschweigen waere hier falsch: die Liste
  // sieht sonst vollstaendig aus.
  uebersprungen: number
}

interface RohFeld {
  Name?: unknown
  Beschreibung?: unknown
  Len?: unknown
  Status?: unknown
}

// `Name` heisst '<Maskennummer>_<Pos>_<Len>'. Alles vor den letzten zwei Teilen
// ist der Vorsatz.
const NAME_MUSTER = /^(.*_)?(\d+_\d+)$/

function alsListe(roh: unknown): RohFeld[] | null {
  if (Array.isArray(roh)) return roh as RohFeld[]
  if (roh && typeof roh === 'object') {
    const maske = (roh as { MASKE?: unknown }).MASKE
    if (Array.isArray(maske)) return maske as RohFeld[]
  }
  return null
}

function zeichenAus(len: unknown): number | undefined {
  const zahl = Number(len)
  if (!Number.isFinite(zahl) || zahl < 1) return undefined
  return Math.min(ZEICHEN_MAX, Math.round(zahl))
}

export function leseMaskenFelder(roh: string): MaskenEinlesung | null {
  let daten: unknown
  try {
    daten = JSON.parse(roh)
  } catch {
    return null
  }
  const liste = alsListe(daten)
  if (liste === null) return null

  const felder: Datenfeld[] = []
  const vorsaetze = new Set<string>()
  let nurAnzeige = 0
  let uebersprungen = 0

  for (const eintrag of liste) {
    const treffer = typeof eintrag?.Name === 'string' ? NAME_MUSTER.exec(eintrag.Name) : null
    if (treffer === null) {
      uebersprungen++
      continue
    }
    const code = treffer[2] ?? ''
    vorsaetze.add(treffer[1] ?? '')
    const beschreibung = typeof eintrag.Beschreibung === 'string'
      ? eintrag.Beschreibung.trim()
      : ''
    const zeichen = zeichenAus(eintrag.Len)
    if (eintrag.Status === 'A') nurAnzeige++
    felder.push({
      // Ohne Beschreibung bleibt der Code als Name stehen: ein leerer Klarname
      // waere ein Feld, das man in keiner Liste wiederfindet.
      name: beschreibung === '' ? code : beschreibung,
      code,
      ...(zeichen === undefined ? {} : { zeichen }),
    })
  }
  if (felder.length === 0) return null

  // Zwei Vorsaetze heissen: die Beschreibung stammt aus zwei Masken. Dann gibt
  // es keinen gemeinsamen, und die Codes bleiben ohne.
  const vorsatz = vorsaetze.size === 1 ? [...vorsaetze][0] ?? '' : ''
  return { vorsatz, felder, nurAnzeige, uebersprungen }
}
