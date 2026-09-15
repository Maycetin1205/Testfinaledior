// Bindet ein Lit-Baustein-Element an den Editor-Baum: Attribute hin, Aenderungen zurueck.
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Baustein } from '../../core/blocks/BlockData'
import { zerlegeBindung } from '../../core/blocks/BlockDefinition'
import { bindungsProp, type BindbareStelle } from '../../core/blocks/faehigkeiten'
import { bausteinArt } from '../../core/blocks/blockRegistry'
import type { QuelleInReichweite } from '../../core/data/sourceLinks'
import type { Editor } from '../../state/Editor'
import type { GestenKlammer } from '../../state/history'

const FREMD_ZEICHEN = ' ↗'

interface PropChangeDetail {
  attr: string
  value: unknown

  // Ein Baustein, der eine ZUSAMMENHAENGENDE Handlung meldet (Ziehen), setzt sie:
  // der Editor klammert alles dazwischen zu EINEM Undo-Schritt.
  geste?: 'beginn' | 'ende'

  // Vom Editor gesetzt, wenn er den Wert NICHT uebernommen hat. Das Ereignis
  // laeuft synchron: der Baustein liest die Antwort direkt nach dem Senden.
  abgelehnt?: boolean
}

interface LitElementArgs {
  editor: Editor

  blockRef: RefObject<Baustein>
  block: Baustein
  selected: boolean | undefined
  bindableSpots: readonly BindbareStelle[]

  quellen: readonly QuelleInReichweite[]

  raster: boolean
}

export function useLitElement({
  editor,
  blockRef,
  block,
  selected,
  bindableSpots,
  quellen,
  raster,
}: LitElementArgs) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const klammer = useRef<GestenKlammer | null>(null)

  const elementRef = useRef<HTMLElement | null>(null)
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const def = bausteinArt(block.type)
    if (!def) {
      console.warn(`BlockHost: keine Bausteinart für Typ "${block.type}"`)
      return
    }
    const container = containerRef.current
    if (!container) return
    const el = document.createElement(def.tagName)

    el.setAttribute('data-ff-editor', '')
    container.appendChild(el)
    elementRef.current = el
    setElement(el)

    const onPropChange = (e: Event) => {
      if (e.target !== el) return
      const ce = e as CustomEvent<PropChangeDetail>
      const detail = ce.detail
      if (!detail || typeof detail.attr !== 'string') return
      if (detail.geste === 'beginn' && !klammer.current) {
        klammer.current = editor.oeffneGeste()
      }
      klammer.current?.oeffne()
      const uebernommen = editor.updateProperty(blockRef.current.id, detail.attr, detail.value)
      if (!uebernommen) detail.abgelehnt = true
      if (detail.geste === 'ende') {
        klammer.current?.schliesse()
        klammer.current = null
      }
    }
    el.addEventListener('ff-prop-change', onPropChange)

    return () => {
    // Stirbt das Element mitten im Zug, bleibt die Klammer sonst offen und
    // schluckt jede spaetere Aenderung in denselben Undo-Schritt.
      klammer.current?.schliesse()
      klammer.current = null
      el.removeEventListener('ff-prop-change', onPropChange)
      if (container.contains(el)) container.removeChild(el)
      elementRef.current = null
      setElement(null)
    }
  }, [block.type, editor, blockRef])

  useEffect(() => {
    const el = elementRef.current
    if (!el) return
    const elAny = el as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(block.props)) {
      elAny[key] = value
    }

    for (const spot of bindableSpots) {
      const wert = block.props[bindungsProp(spot.prop)]
      if (typeof wert !== 'string' || wert === '') continue

      const { quelleId, code } = zerlegeBindung(wert)
      const quelle = quelleId === ''
        ? quellen[0]?.source
        : quellen.find((q) => q.source.id === quelleId)?.source
      const field = quelle?.fields.find((f) => f.code === code)
      if (field) {
        elAny[spot.vorschauProp ?? spot.prop] = field.label
          + (quelleId === '' ? '' : FREMD_ZEICHEN)
      } else {
        elAny[bindungsProp(spot.prop)] = ''
      }
    }

    elAny.editable = !!selected

    el.toggleAttribute('fuellt', !!raster)
  }, [element, block.type, block.props, selected, bindableSpots, quellen, raster])

  return { containerRef, elementRef, element }
}
