import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { bindingFields, bindingJoiner } from '../../core/block/binding'
import { splitBinding } from '../../core/block/blockType'
import { bindingProp, type BindableSpot } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { BlockElement, PROP_CHANGE, type PropChange } from '../../blocks/base/BlockElement'
import { fieldInReachOf, type SourceInReach } from '../../core/data/extraSources'
import type { EditorStore } from '../state/EditorStore'

const FOREIGN_ICON = ' ↗'

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
      const { prop, value } = (e as CustomEvent<PropChange>).detail
      editor.updateProperty(blockRef.current.id, prop, value)
    }
    el.addEventListener(PROP_CHANGE, onPropChange)

    return () => {
      el.removeEventListener(PROP_CHANGE, onPropChange)
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

      const names = bindingFields(value).flatMap((binding) => {
        const field = fieldInReachOf(binding, sources)
        return field ? [field.name + (splitBinding(binding).sourceId === '' ? '' : FOREIGN_ICON)] : []
      })
      if (names.length > 0) {
        el.setDeclared(spot.previewProp ?? spot.prop, names.join(bindingJoiner(value)))
      } else {
        el.setDeclared(bindingProp(spot.prop), '')
      }
    }

    el.editable = !!selected

    el.toggleAttribute('fills', !!grid)
  }, [element, block.type, block.values, selected, bindableSpots, sources, grid])

  return { containerRef, elementRef, element }
}
