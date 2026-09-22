import type { EditorStore } from './EditorStore'

const TEMPLATE_CARD_PROTECTED =
  'Hier liegt die Musterkarte — aus ihr entstehen die Datenkarten, sie kann '
  + 'nicht gelöscht werden. Ziehe sie erst in eine andere Spalte.'

export function deleteBlock(editor: EditorStore, id: string): void {
  if (editor.isRemoveProtected(id)) {
    editor.messages.report(TEMPLATE_CARD_PROTECTED)
    return
  }
  editor.removeBlock(id)
}
