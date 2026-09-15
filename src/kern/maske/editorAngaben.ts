// Die Angaben, die nur der Editor zu einem Bausteintyp braucht (Symbol).
export type BausteinSymbol = (eigenschaften: {
  size?: number | string
  className?: string
}) => unknown

export interface EditorAngaben {
  symbol?: BausteinSymbol
}

const ablage = new Map<string, EditorAngaben>()

const KEINE: EditorAngaben = {}

export function ergaenzeEditorAngaben(type: string, angaben: EditorAngaben): void {
  ablage.set(type, angaben)
}

export function editorAngabenVon(type: string): EditorAngaben {
  return ablage.get(type) ?? KEINE
}
