// Die Breite, die ein Feld seiner Spalte beim Anlegen mitgibt. Nur der Editor
// rechnet das: in der Maske steht laengst eine gewoehnliche Spaltenbreite.
import { zerlegeBindung } from '../../kern/maske/bausteinArt'
import type { QuelleInReichweite } from '../../kern/daten/weitereQuellen'

// Ein Zeichen der Maskenschrift (Segoe UI, 13px) ist rund 7 px breit, links und
// rechts sitzen je 10 px Polsterung (--se-zell-x). Grosszuegig gerundet: eine
// Spalte darf eher etwas zu breit sein als einen Wert abschneiden.
const ZEICHEN_PX = 7
const POLSTER_PX = 20

// Eine Spaltenbreite ist ein ANTEIL, kein Pixelmass; der Kantenzug schreibt
// gemessene Pixel hinein. Damit beides zusammenpasst, rechnet auch das Feld in
// Pixel. Die Polsterung waechst nicht mit, darum steht sie ausserhalb der
// Multiplikation - sonst bekaeme eine Spalte mit 3 Zeichen zu wenig.
export function breiteAusZeichen(zeichen: number | undefined): number | undefined {
  if (zeichen === undefined || !Number.isFinite(zeichen) || zeichen < 1) return undefined
  return Math.round(zeichen) * ZEICHEN_PX + POLSTER_PX
}

// Was am gewaehlten Feld als Zeichenzahl steht. Die Bindung kann auf eine
// fremde Quelle zeigen; ohne Quellen-Teil gilt die Hauptquelle.
export function zeichenVon(
  wert: string,
  quellen: readonly QuelleInReichweite[],
): number | undefined {
  const { quelleId, code } = zerlegeBindung(wert)
  const quelle = quelleId === ''
    ? quellen[0]?.source
    : quellen.find((q) => q.source.id === quelleId)?.source
  return quelle?.fields.find((f) => f.code === code)?.zeichen
}
