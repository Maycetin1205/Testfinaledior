import { useEffect } from 'react'
import { blockType } from '../../core/block/registry'
import { gridMetricsOf, gridSlotRead } from '../../core/block/grid'
import { capacityOf } from '../canvas/gridArea'
import { useEditorInstance } from './EditorContext'
import { saveMaskAsFile } from './maskFile'

type Editor = ReturnType<typeof useEditorInstance>

// An arrow key carries the marked block one cell; with Shift it changes the
// size by one cell. Cells another block stands on are refused by the tree.
function nudge(editor: Editor, id: string, key: string, resize: boolean): void {
  const node = editor.getNode(id)
  if (!node || !node.parentId) return
  const slot = gridSlotRead(node.values)
  const dx = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0
  const dy = key === 'ArrowUp' ? -1 : key === 'ArrowDown' ? 1 : 0
  const capacity = capacityOf(editor.tree, node.parentId)
  if (resize) {
    const spec = gridMetricsOf(blockType(node.type))
    const fixedHeight = spec.heightFixed || spec.heightFromContent
    const w = Math.max(1, spec.minWidth, slot.w + dx)
    const h = fixedHeight ? slot.h : Math.max(1, spec.minHeight, slot.h + dy)
    editor.resizeNodeToSlot(id, { ...slot, w, h: capacity === null ? h : Math.min(h, capacity - slot.y) })
    return
  }
  const x = Math.max(0, slot.x + dx)
  const y = Math.max(0, slot.y + dy)
  editor.moveNodeToCell(id, node.parentId, x, capacity === null ? y : Math.min(y, Math.max(0, capacity - slot.h)))
}

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
      if (chosen !== null && e.key.startsWith('Arrow') && !e.ctrlKey && !e.metaKey && !e.altKey
        && !inInputField(e) && !inDataPanel(e) && !windowOpen()) {
        e.preventDefault()
        nudge(editor, chosen, e.key, e.shiftKey)
        return
      }
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
