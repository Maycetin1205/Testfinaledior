import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import type { BlockNode } from '../../core/block/tree'
import { bindingProp, type BindableSpot } from '../../core/block/capability'
import type { PropertyValue } from '../../core/block/property'
import type { SpotClick } from '../../blocks/base/BlockElement'
import type { EditorStore } from '../state/EditorStore'

// How long a click waits, so a double click can still type the text.
const DOUBLE_CLICK_WAIT = 300

export function bindingCode(props: Readonly<Record<string, PropertyValue>>, spot: BindableSpot): string {
  const code = props[bindingProp(spot.prop)]
  return typeof code === 'string' ? code : ''
}

interface BindingPickerArgs {
  editor: EditorStore
  blockRef: RefObject<BlockNode>
  selected: boolean | undefined
  bindableSpots: readonly BindableSpot[]

  hasOffer: boolean

  // The spot the block reported for a click.
  spotClickOf: (click: Event) => SpotClick | null

  onSelect?: () => void
}

export function useBindingPicker({
  editor,
  blockRef,
  selected,
  bindableSpots,
  hasOffer,
  spotClickOf,
  onSelect,
}: BindingPickerArgs) {
  const [picker, setPicker] = useState<{ spot: BindableSpot; top: number; left: number } | null>(null)
  const pickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPickerTimer = () => {
    if (pickerTimer.current) {
      clearTimeout(pickerTimer.current)
      pickerTimer.current = null
    }
  }

  useEffect(() => clearPickerTimer, [])

  if (!selected && picker !== null) setPicker(null)

  function spotAt(e: ReactMouseEvent<HTMLDivElement>): { spot: BindableSpot; rect: DOMRect } | null {
    const reported = spotClickOf(e.nativeEvent)
    if (reported?.kind !== 'binding') return null
    const spot = bindableSpots.find((s) => s.prop === reported.prop)
    return spot ? { spot, rect: reported.rect } : null
  }

  function pickerPos(spotRect: DOMRect): { top: number; left: number } {
    return {
      top: Math.max(8, spotRect.bottom + 4),
      left: Math.max(8, Math.min(spotRect.left, window.innerWidth - 248)),
    }
  }

  function onClick(e: ReactMouseEvent<HTMLDivElement>) {
    const wasSelected = editor.selectedId === blockRef.current.id
    e.stopPropagation()
    onSelect?.()
    clearPickerTimer()

    if (!hasOffer || !wasSelected) return
    if (e.detail > 1) return
    const hit = spotAt(e)
    if (!hit) return
    const pos = pickerPos(hit.rect)

    if (bindingCode(blockRef.current.values, hit.spot) !== '') {
      setPicker({ spot: hit.spot, ...pos })
      return
    }

    pickerTimer.current = setTimeout(() => {
      pickerTimer.current = null
      if (editor.selectedId === blockRef.current.id) {
        setPicker({ spot: hit.spot, ...pos })
      }
    }, DOUBLE_CLICK_WAIT)
  }

  function onDoubleClick(e: ReactMouseEvent<HTMLDivElement>) {
    clearPickerTimer()
    if (!hasOffer) return
    const hit = spotAt(e)
    if (!hit || bindingCode(blockRef.current.values, hit.spot) === '') return
    e.stopPropagation()
    setPicker({ spot: hit.spot, ...pickerPos(hit.rect) })
  }

  return {
    picker,
    closePicker: () => setPicker(null),
    onClick,
    onDoubleClick,
  }
}
