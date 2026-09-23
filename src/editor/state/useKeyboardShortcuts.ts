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

function windowOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null
}

export type KeyEffect =
  | 'nothing'
  | 'save'
  | 'delete'
  | 'abwaehlen'
  | 'back'
  | 'vor'
  | 'duplicate'

export interface KeyPlacement {
  key: string

  mod: boolean

  shift: boolean

  inInputField: boolean

  windowOpen: boolean

  somethingChosen: boolean
}

export function keyEffect(placement: KeyPlacement): KeyEffect {
  const letter = placement.key.toLowerCase()

  if (placement.mod && letter === 's') return 'save'

  if (placement.inInputField || placement.windowOpen) return 'nothing'

  if (!placement.mod) {
    if (placement.key === 'Delete' || placement.key === 'Backspace') {
      return placement.somethingChosen ? 'delete' : 'nothing'
    }
    if (placement.key === 'Escape') return placement.somethingChosen ? 'abwaehlen' : 'nothing'
    return 'nothing'
  }

  if (letter === 'z') return placement.shift ? 'vor' : 'back'
  if (letter === 'y') return 'vor'
  if (letter === 'd') return placement.somethingChosen ? 'duplicate' : 'nothing'
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
        windowOpen: windowOpen(),
        somethingChosen: chosen !== null,
      })
      if (effect === 'nothing') return

      if (effect !== 'abwaehlen') e.preventDefault()

      switch (effect) {
        case 'save':
          saveMaskAsFile(editor)
          break
        case 'delete':
          if (chosen) editor.removeBlock(chosen)
          break
        case 'abwaehlen':
          editor.selectBlock(null)
          break
        case 'back':
          editor.undo()
          break
        case 'vor':
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
