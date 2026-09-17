// Eine Quelle, die ihren Wert selbst mit einem Relations-Ruf holt.
import {
  pruefeParameterBindung,
  type Parameter,
  type ParameterQuelle,
} from './aktionen'
import { artFuer, traegt, type QuellenArtKennung } from './quellenArten'

// Eine Quelle holt ohne Baustein und ohne laufende Kette: was an einem Klick,
// einer Zeile oder einem Schritt-Ergebnis haengt, ginge hier still leer hinaus.
export const HOL_WERT_QUELLEN = ['fixed', 'data_field', 'se_variable'] as const

export function holWertQuelleErlaubt(source: ParameterQuelle): boolean {
  // 'aus' ist kein Angebot, nur Nachsicht mit Gespeichertem.
  return source === 'aus' || (HOL_WERT_QUELLEN as readonly string[]).includes(source)
}

export interface HolWert {
  relationId: string

  parameter: readonly Parameter[]
}

export function pruefeHolWert(raw: unknown): HolWert | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const relationId = typeof e.relationId === 'string' ? e.relationId.trim() : ''
  if (relationId === '') return null
  if (!Array.isArray(e.parameter)) return null
  const params: Parameter[] = []
  for (const roh of e.parameter) {
    const binding = pruefeParameterBindung(roh)
  // Ein unlesbarer Parameter macht die ganze Angabe ungueltig: ihn einzeln
  // wegzulassen verschoebe stumm das Parameter-Feld.
    if (!binding || !holWertQuelleErlaubt(binding.quelle)) return null
    params.push(binding)
  }
  return { relationId, parameter: params }
}

export function holWertVon(
  source: { art: QuellenArtKennung; holWert?: HolWert },
): HolWert | null {
  if (!traegt(artFuer(source.art), 'HOL_WERT')) return null
  return source.holWert ?? null
}

// Die Quellen, aus denen ein Parameter liest: sie muessen mit in die Maske, sonst
// faende die Laufzeit sie nicht.
export function quellenAusHolWert(
  source: { art: QuellenArtKennung; holWert?: HolWert },
): { quelleId: string; code: string }[] {
  const raus: { quelleId: string; code: string }[] = []
  for (const binding of holWertVon(source)?.parameter ?? []) {
    if (binding.quelle !== 'data_field') continue
    const quelleId = binding.quelleId ?? ''
    if (quelleId !== '') raus.push({ quelleId, code: binding.wert })
  }
  return raus
}
