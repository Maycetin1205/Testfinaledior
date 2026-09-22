export type BlockIcon = (properties: {
  size?: number | string
  className?: string
}) => unknown

export interface EditorFacts {
  symbol?: BlockIcon
}

const store = new Map<string, EditorFacts>()

const NO: EditorFacts = {}

export function addEditorFacts(type: string, facts: EditorFacts): void {
  store.set(type, facts)
}

export function editorFactsOf(type: string): EditorFacts {
  return store.get(type) ?? NO
}
