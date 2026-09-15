// Die Tastenkuerzel des Editors.
import { useEffect } from 'react'
import { useEditorInstance } from './EditorContext'
import { loescheBaustein } from './loescheBaustein'
import { speichereMaskeAlsDatei } from './maskenDatei'

function inEingabefeld(e: KeyboardEvent): boolean {
  for (const ziel of e.composedPath()) {
    if (!(ziel instanceof HTMLElement)) continue
    const tag = ziel.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (ziel.isContentEditable) return true
  }
  return false
}

// Ein offenes Fenster (Datencenter, Feld-Picker, Menue) nimmt Escape selbst.
function fensterOffen(): boolean {
  return document.querySelector('[role="dialog"]') !== null
}

export function useKeyboardShortcuts() {
  const editor = useEditorInstance()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey

  // Strg+S speichert die Maske als Datei, auch aus einem Eingabefeld heraus:
  // sonst oeffnet der Browser seinen eigenen Speicherdialog.
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        speichereMaskeAlsDatei(editor)
        return
      }

      if (inEingabefeld(e)) return

      if (!mod && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (editor.selectedId) {
          e.preventDefault()
          loescheBaustein(editor, editor.selectedId)
        }
        return
      }

      if (!mod && e.key === 'Escape') {
        if (editor.selectedId === null || fensterOffen()) return
        editor.selectBlock(null)
        return
      }

      if (!mod) return

      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) editor.redo()
          else editor.undo()
          break
        case 'y':
          e.preventDefault()
          editor.redo()
          break
        case 'd':
          if (editor.selectedId) {
            e.preventDefault()
            editor.duplicateBlock(editor.selectedId)
          }
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor])
}
