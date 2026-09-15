// Die Form des Baustein-Baums: ein Knoten je Baustein, die Wurzel heisst root.
import type { Ketten } from '../daten/aktionen'

export interface Baustein {
  id: string
  type: string
  props: Record<string, unknown>

  events?: Ketten
  parentId: string | null
  childIds: string[]
}

export type Maskenbaum = Record<string, Baustein>

export const WURZEL_ID = 'root'
export const WURZEL_TYP = 'root'
