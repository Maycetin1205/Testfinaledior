import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { splitBinding } from '../../core/block/blockType'
import { bindingProp, type BindableSpot } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { BlockElement } from '../../blocks/base/BlockElement'
import type { SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'
import type { GestureBracket } from '../state/history'

const FOREIGN_ICON = ' ↗'

interface PropChangeDetail {
  attr: string
  value: unknown

  gesture?: 'start' | 'end'

  rejected?: boolean
}

interface LitElementArgs {
  editor: EditorStore

  blockRef: RefObject<BlockNode>
  block: BlockNode
  selected: boolean | undefined
  bindableSpots: readonly BindableSpot[]

  sources: readonly SourceInReach[]

  grid: boolean
}

export function useLitElement({
  editor,
  blockRef,
  block,
  selected,
  bindableSpots,
  sources,
  grid,
}: LitElementArgs) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const bracket = useRef<GestureBracket | null>(null)

  const elementRef = useRef<HTMLElement | null>(null)
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const def = blockType(block.type)
    if (!def) {
      console.warn(`BlockHost: keine Bausteinart für Typ "${block.type}"`)
      return
    }
    const container = containerRef.current
    if (!container) return
    const el = document.createElement(def.tag)

    el.setAttribute('preview', '')
    container.appendChild(el)
    elementRef.current = el
    setElement(el)

    const onPropChange = (e: Event) => {
      if (e.target !== el) return
      const ce = e as CustomEvent<PropChangeDetail>
      const detail = ce.detail
      if (!detail || typeof detail.attr !== 'string') return
      if (detail.gesture === 'start' && !bracket.current) {
        bracket.current = editor.openGesture()
      }
      bracket.current?.open()
      const adopted = editor.updateProperty(blockRef.current.id, detail.attr, detail.value)
      if (!adopted) detail.rejected = true
      if (detail.gesture === 'end') {
        bracket.current?.close()
        bracket.current = null
      }
    }
    el.addEventListener('ff-prop-change', onPropChange)

    return () => {
      bracket.current?.close()
      bracket.current = null
      el.removeEventListener('ff-prop-change', onPropChange)
      if (container.contains(el)) container.removeChild(el)
      elementRef.current = null
      setElement(null)
    }
  }, [block.type, editor, blockRef])

  useEffect(() => {
    const el = elementRef.current
    if (!(el instanceof BlockElement)) return
    for (const [key, value] of Object.entries(block.values)) {
      el.setDeclared(key, value)
    }

    for (const spot of bindableSpots) {
      const value = block.values[bindingProp(spot.prop)]
      if (typeof value !== 'string' || value === '') continue

      const { sourceId, code } = splitBinding(value)
      const source = sourceId === ''
        ? sources[0]?.source
        : sources.find((q) => q.source.id === sourceId)?.source
      const field = source?.fields.find((f) => f.code === code)
      if (field) {
        el.setDeclared(spot.previewProp ?? spot.prop, field.name
          + (sourceId === '' ? '' : FOREIGN_ICON))
      } else {
        el.setDeclared(bindingProp(spot.prop), '')
      }
    }

    el.editable = !!selected

    el.toggleAttribute('fills', !!grid)
  }, [element, block.type, block.values, selected, bindableSpots, sources, grid])

  return { containerRef, elementRef, element }
}
