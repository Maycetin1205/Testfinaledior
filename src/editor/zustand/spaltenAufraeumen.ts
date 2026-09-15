// Nach dem Streichen einer Spalte: Ketten-Parameter, die auf sie zeigten, abschalten.
import type { Baustein, Maskenbaum } from '../../kern/maske/baum'
import type { BausteinArt } from '../../kern/maske/bausteinArt'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { listeLesen } from '../../kern/maske/listenBindung'
import {
  ZELLEN_PARAM_QUELLEN,
  type Parameter,
  type Schritt,
} from '../../kern/daten/aktionen'

// Sichtbar wird ein verwaister Zeiger nirgends: der Export macht daraus die
// Platznummer -1 und die Laufzeit schreibt kommentarlos einen Leerstring ins ERP.
// Generisch ueber die Listen-Bindung, kein Bausteintyp-Sondercode.

export function gestricheneKennungen(
  def: BausteinArt | undefined,
  attr: string,
  alt: unknown,
  neu: unknown,
): string[] {
  const b = faehigkeit(def, 'liste')?.bindung
  const key = b?.kennungSchluessel
  if (!b || key === undefined || b.prop !== attr) return []
  const kennungen = (wert: unknown): string[] => listeLesen(wert, b)
    .map((eintrag) => String(eintrag[key] ?? ''))
    .filter((kennung) => kennung !== '')
  const bleibt = new Set(kennungen(neu))
  return kennungen(alt).filter((kennung) => !bleibt.has(kennung))
}

function schrittOhneZeiger(
  schritt: Schritt,
  blockId: string,
  weg: ReadonlySet<string>,
): { schritt: Schritt; getroffen: number } | null {
  if (schritt.art !== 'RELATION') return null
  let getroffen = 0
  const abraeumen = (liste: Parameter[]): Parameter[] =>
    liste.map((b) => {
      const zeigt = ZELLEN_PARAM_QUELLEN[b.quelle] !== undefined
        && (b.bausteinId ?? '') === blockId
        && weg.has(b.wert)
      if (!zeigt) return b
      getroffen++
  // 'aus' ist die sichtbare Antwort: die Steuerung zeigt den Parameter
  // ausgegraut, die Laufzeit liefert ''.
      return { quelle: 'aus' as const, wert: '' }
    })
  const params = abraeumen(schritt.parameter)
  const extraParams = abraeumen(schritt.zusatzParameter)
  return getroffen > 0 ? { schritt: { ...schritt, parameter: params, zusatzParameter: extraParams }, getroffen } : null
}

export interface Abgeraeumt {
  tree: Maskenbaum

  // Der Editor sagt es dem Bediener, weil die Bausteine woanders stehen koennen.
  parameter: number
  bausteine: number
}

// Ketten stehen auf beliebigen Bausteinen, nicht nur auf dem mit der Liste,
// darum laeuft das ueber den ganzen Baum.
export function ohneSpaltenZeiger(
  tree: Maskenbaum,
  blockId: string,
  gestrichen: readonly string[],
): Abgeraeumt {
  if (gestrichen.length === 0) return { tree, parameter: 0, bausteine: 0 }
  const weg = new Set(gestrichen)
  let parameter = 0
  let bausteine = 0
  const next: Maskenbaum = { ...tree }
  for (const node of Object.values(tree) as Baustein[]) {
    if (!node.ketten) continue
    const events: Record<string, Schritt[]> = {}
    let nodeGetroffen = 0
    for (const [key, schritte] of Object.entries(node.ketten)) {
      events[key] = schritte.map((s) => {
        const neu = schrittOhneZeiger(s, blockId, weg)
        if (!neu) return s
        nodeGetroffen += neu.getroffen
        return neu.schritt
      })
    }
    if (nodeGetroffen === 0) continue
    next[node.id] = { ...node, ketten: events }
    parameter += nodeGetroffen
    bausteine++
  }
  return bausteine > 0 ? { tree: next, parameter, bausteine } : { tree, parameter: 0, bausteine: 0 }
}
