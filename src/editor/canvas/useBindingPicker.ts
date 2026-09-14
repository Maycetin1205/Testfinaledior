// Oeffnet den Feld-Waehler fuer eine gebundene Stelle.
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import type { BlockNode } from '../../core/blocks/BlockData'
import { bindingProp, type BindableSpot } from '../../core/blocks/BlockDefinition'
import type { Editor } from '../../state/Editor'

export function bindingCode(props: Record<string, unknown>, spot: BindableSpot): string {
  const code = props[bindingProp(spot.prop)]
  return typeof code === 'string' ? code : ''
}

interface BindingPickerArgs {
  editor: Editor
  blockRef: RefObject<BlockNode>
  selected: boolean | undefined
  bindableSpots: readonly BindableSpot[]

  hatAngebot: boolean

  onSelect?: () => void
}

export function useBindingPicker({
  editor,
  blockRef,
  selected,
  bindableSpots,
  hatAngebot,
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

  function spotAt(e: ReactMouseEvent<HTMLDivElement>): { spot: BindableSpot; el: HTMLElement } | null {
    if (bindableSpots.length === 0) return null
    for (const t of e.nativeEvent.composedPath()) {
      if (t === e.currentTarget) return null
      if (t instanceof HTMLElement && t.hasAttribute('data-ff-spot')) {
        const spot = bindableSpots.find((s) => s.prop === t.getAttribute('data-ff-spot'))
        return spot ? { spot, el: t } : null
      }
    }
    return null
  }

  function pickerPos(spotEl: HTMLElement): { top: number; left: number } {
    const spotRect = spotEl.getBoundingClientRect()
    return {
      top: Math.max(8, spotRect.bottom + 4),
      left: Math.max(8, Math.min(spotRect.left, window.innerWidth - 248)),
    }
  }

  function onClick(e: ReactMouseEvent<HTMLDivElement>) {
    // Der erste Klick waehlt den Baustein nur. Erst ein Klick auf den schon
    // GEWAEHLTEN macht den Feldwaehler auf: sonst ginge er bei jedem Anfassen
    // zum Verschieben auf, auch ohne eine einzige Datenquelle.
    const warGewaehlt = editor.selectedId === blockRef.current.id
    e.stopPropagation()
    onSelect?.()
    clearPickerTimer()

    if (!hatAngebot || !warGewaehlt) return
    if (e.detail > 1) return
    const hit = spotAt(e)
    if (!hit) return
    const pos = pickerPos(hit.el)

    if (bindingCode(blockRef.current.props, hit.spot) !== '') {
      setPicker({ spot: hit.spot, ...pos })
      return
    }

    pickerTimer.current = setTimeout(() => {
      pickerTimer.current = null
      if (editor.selectedId === blockRef.current.id) {
        setPicker({ spot: hit.spot, ...pos })
      }
    }, 300)
  }

  function onDoubleClick(e: ReactMouseEvent<HTMLDivElement>) {
    clearPickerTimer()
    if (!hatAngebot) return
    const hit = spotAt(e)
    if (!hit || bindingCode(blockRef.current.props, hit.spot) === '') return
    e.stopPropagation()
    setPicker({ spot: hit.spot, ...pickerPos(hit.el) })
  }

  return {
    picker,
    closePicker: () => setPicker(null),
    onClick,
    onDoubleClick,
  }
}
