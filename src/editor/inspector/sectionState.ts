import { useCallback } from 'react'
import type { SectionName } from '../state/inspectorSections'
import { useEditorInstance } from '../state/EditorContext'
import { useView } from '../state/useView'

export function useSection(name: SectionName): [boolean, (open: boolean) => void] {
  const editor = useEditorInstance()
  const open = useView().sectionOpen(name)
  const toggle = useCallback(
    (next: boolean) => editor.setSection(name, next),
    [editor, name],
  )
  return [open, toggle]
}
