// Einen Baustein samt Kindern aus dem Baum nehmen.
import { meldungen } from './meldungen'
import type { Editor } from './Editor'

const MUSTERKARTE_GESCHUETZT =
  'Hier liegt die Musterkarte — aus ihr entstehen die Datenkarten, sie kann '
  + 'nicht gelöscht werden. Ziehe sie erst in eine andere Spalte.'

export function loescheBaustein(editor: Editor, id: string): void {
  if (editor.isRemoveProtected(id)) {
    meldungen.melde(MUSTERKARTE_GESCHUETZT)
    return
  }
  editor.removeBlock(id)
}
