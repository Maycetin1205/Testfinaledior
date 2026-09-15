// Die Form des Baustein-Baums: ein Knoten je Baustein, die Wurzel heisst root.
import type { Ketten } from '../daten/aktionen'

export interface Baustein {
  id: string
  typ: string
  werte: Record<string, unknown>

  ketten?: Ketten
  elternId: string | null
  kinderIds: string[]
}

export type Maskenbaum = Record<string, Baustein>

export const WURZEL_ID = 'root'
export const WURZEL_TYP = 'root'
