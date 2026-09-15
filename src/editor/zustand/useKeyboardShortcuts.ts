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

// Ein offenes Fenster (Datencenter, Feld-Picker, Menue) nimmt die Taste selbst.
// Ein Popup auf der Flaeche ist keines: sein Rahmen liegt im Schatten des
// Bausteins, und dorthin sieht `document.querySelector` nicht.
function fensterOffen(): boolean {
  return document.querySelector('[role="dialog"]') !== null
}

export type Tastenwirkung =
  | 'nichts'
  | 'speichern'
  | 'loeschen'
  | 'abwaehlen'
  | 'zurueck'
  | 'vor'
  | 'duplizieren'

export interface Tastenlage {
  taste: string

  mod: boolean

  shift: boolean

  imEingabefeld: boolean

  fensterOffen: boolean

  etwasGewaehlt: boolean
}

// Das Urteil kommt ohne DOM aus, damit ein Test es prueft: was auf die Flaeche
// wirkt, wirkt nicht durch ein offenes Fenster hindurch auf den Baustein
// dahinter, den dabei niemand sieht.
export function tastenwirkung(lage: Tastenlage): Tastenwirkung {
  const buchstabe = lage.taste.toLowerCase()

  // Strg+S auch aus einem Eingabefeld und ueber jedem Fenster: sonst oeffnet
  // der Browser seinen eigenen Speicherdialog.
  if (lage.mod && buchstabe === 's') return 'speichern'

  if (lage.imEingabefeld || lage.fensterOffen) return 'nichts'

  if (!lage.mod) {
    if (lage.taste === 'Delete' || lage.taste === 'Backspace') {
      return lage.etwasGewaehlt ? 'loeschen' : 'nichts'
    }
    if (lage.taste === 'Escape') return lage.etwasGewaehlt ? 'abwaehlen' : 'nichts'
    return 'nichts'
  }

  if (buchstabe === 'z') return lage.shift ? 'vor' : 'zurueck'
  if (buchstabe === 'y') return 'vor'
  if (buchstabe === 'd') return lage.etwasGewaehlt ? 'duplizieren' : 'nichts'
  return 'nichts'
}

export function useKeyboardShortcuts() {
  const editor = useEditorInstance()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const gewaehlt = editor.selectedId
      const wirkung = tastenwirkung({
        taste: e.key,
        mod: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        imEingabefeld: inEingabefeld(e),
        fensterOffen: fensterOffen(),
        etwasGewaehlt: gewaehlt !== null,
      })
      if (wirkung === 'nichts') return

      // Escape laeuft weiter; die uebrigen haette sonst der Browser belegt.
      if (wirkung !== 'abwaehlen') e.preventDefault()

      switch (wirkung) {
        case 'speichern':
          speichereMaskeAlsDatei(editor)
          break
        case 'loeschen':
          if (gewaehlt) loescheBaustein(editor, gewaehlt)
          break
        case 'abwaehlen':
          editor.selectBlock(null)
          break
        case 'zurueck':
          editor.undo()
          break
        case 'vor':
          editor.redo()
          break
        case 'duplizieren':
          if (gewaehlt) editor.duplicateBlock(gewaehlt)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor])
}
