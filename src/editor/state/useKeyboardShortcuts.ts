import { useEffect } from 'react'
import { capacityOf } from '../canvas/gridArea'
import { useEditorInstance } from './EditorContext'
import { saveMaskAsFile } from './maskFile'

function inInputField(e: KeyboardEvent): boolean {
  for (const target of e.composedPath()) {
    if (!(target instanceof HTMLElement)) continue
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (target.isContentEditable) return true
  }
  return false
}

// The data beside the mask have lists of their own; Delete there is not meant
// for the marked block.
function inDataPanel(e: KeyboardEvent): boolean {
  return e.composedPath().some((t) => t instanceof HTMLElement && t.dataset.ffDataPanel !== undefined)
}

function windowOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null
}

type KeyEffect =
  | 'nothing'
  | 'save'
  | 'delete'
  | 'deselect'
  | 'back'
  | 'forward'
  | 'duplicate'

interface KeyPlacement {
  key: string

  mod: boolean

  shift: boolean

  inInputField: boolean

  inDataPanel: boolean

  windowOpen: boolean

  somethingChosen: boolean
}

function keyEffect(placement: KeyPlacement): KeyEffect {
  const letter = placement.key.toLowerCase()

  if (placement.mod && letter === 's') return 'save'

  if (placement.inInputField || placement.windowOpen) return 'nothing'

  if (!placement.mod) {
    if (placement.inDataPanel) return 'nothing'
    if (placement.key === 'Delete' || placement.key === 'Backspace') {
      return placement.somethingChosen ? 'delete' : 'nothing'
    }
    if (placement.key === 'Escape') return placement.somethingChosen ? 'deselect' : 'nothing'
    return 'nothing'
  }

  if (letter === 'z') return placement.shift ? 'forward' : 'back'
  if (letter === 'y') return 'forward'
  if (letter === 'd') return placement.somethingChosen && !placement.inDataPanel ? 'duplicate' : 'nothing'
  return 'nothing'
}

export function useKeyboardShortcuts() {
  const editor = useEditorInstance()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const chosen = editor.selectedId
      const effect = keyEffect({
        key: e.key,
        mod: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        inInputField: inInputField(e),
        inDataPanel: inDataPanel(e),
        windowOpen: windowOpen(),
        somethingChosen: chosen !== null,
      })
      if (effect === 'nothing') return

      if (effect !== 'deselect') e.preventDefault()

      switch (effect) {
        case 'save':
          saveMaskAsFile(editor)
          break
        case 'delete':
          if (chosen) editor.removeBlock(chosen)
          break
        case 'deselect':
          editor.selectBlock(null)
          break
        case 'back':
          editor.undo()
          break
        case 'forward':
          editor.redo()
          break
        case 'duplicate':
          if (chosen) {
            editor.duplicateBlock(chosen, capacityOf(editor.tree, editor.getNode(chosen)?.parentId))
          }
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor])
}
