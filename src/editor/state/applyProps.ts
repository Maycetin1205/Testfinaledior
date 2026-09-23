import type { EditorStore } from './EditorStore'

export function applyProps(
  editor: EditorStore,
  id: string,
  patch: Readonly<Record<string, unknown>>,
): boolean {
  const entries = Object.entries(patch)
  if (entries.length === 0) return false
  editor.transaction(() => {
    for (const [attr, value] of entries) editor.updateProperty(id, attr, value)
  })
  return true
}
