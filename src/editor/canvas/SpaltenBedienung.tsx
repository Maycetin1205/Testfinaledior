// Die Editor-Bedienung der Listeneintraege, als Schicht ueber den Stellen des Bausteins.
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { cn } from '@/editor/werkbank/cn'
import type { Baustein } from '../../kern/maske/baum'
import type { ListenBindung } from '../../kern/maske/bausteinArt'
import { useEditorInstance } from '../zustand/EditorContext'
import { wendeProps } from '../zustand/propsPatch'

interface Stelle {
  left: number
  top: number
  width: number
  height: number

  // Der Platz des Eintrags in der VOLLEN Liste, aus dem Attribut und nicht aus
  // der DOM-Reihenfolge: gefiltert gezeichnet traefe die Reihenfolge den falschen.
  platz: number
}

interface SpaltenBedienungProps {
  block: Baustein
  bindung: ListenBindung
  selektor: string

  element: HTMLElement | null

  // Bezugsrahmen fuer die Masse (BlockHost-Wurzel, position: relative).
  wirt: RefObject<HTMLElement | null>

  container: RefObject<HTMLElement | null>
  onSelect?: () => void
}

const ZUG_SCHWELLE = 5

// An jeder Zellkante gehoeren ein paar Pixel dem Breiten-Griff der Maske; die
// Schicht laesst sie frei.
const GRIFF_RAND = 6

function messe(element: HTMLElement, wirt: HTMLElement, selektor: string): Stelle[] {
  const root = element.shadowRoot
  if (!root) return []
  const bezug = wirt.getBoundingClientRect()
  return Array.from(root.querySelectorAll<HTMLElement>(selektor)).map((el, i) => {
    const r = el.getBoundingClientRect()
    const roh = Number(el.getAttribute('data-ff-eintrag'))
    return {
      left: r.left - bezug.left,
      top: r.top - bezug.top,
      width: r.width,
      height: r.height,
      platz: Number.isInteger(roh) ? roh : i,
    }
  })
}

// Klick oeffnet den Feld-Picker, Ziehen ordnet um. Der Baustein zeichnet dafuer
// nichts, die Maske traegt keinen Editor-Code. Die Stellen werden gemessen und
// ueber Resize- und MutationObserver nachgefuehrt, nie im Rendern.
export function SpaltenBedienung({
  block, bindung, selektor, element, wirt, container, onSelect,
}: SpaltenBedienungProps) {
  const editor = useEditorInstance()
  const [stellen, setStellen] = useState<Stelle[]>([])
  const [zug, setZug] = useState<{ von: number; slot: number } | null>(null)

  useEffect(() => {
    const el = element
    const rahmen = wirt.current
    if (!el || !rahmen || !el.shadowRoot) return
    const nachmessen = (): void => setStellen(messe(el, rahmen, selektor))
    // Der ResizeObserver meldet sich beim Anmelden einmal von selbst; das ist die
    // erste Messung.
    const ro = new ResizeObserver(nachmessen)
    ro.observe(el)
    const mo = new MutationObserver(nachmessen)
    mo.observe(el.shadowRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-ff-eintrag'],
    })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [element, wirt, selektor])

  const oeffnePicker = (index: number): void => {
    onSelect?.()
    const ziel = container.current
    const rahmen = wirt.current
    const s = stellen[index]
    if (!ziel || !rahmen || !s) return
    const bezug = rahmen.getBoundingClientRect()
    ziel.dispatchEvent(new CustomEvent('ff-listen-bind', {
      detail: {
        prop: bindung.prop,
        index: s.platz,
        top: bezug.top + s.top + s.height + 4,
        left: bezug.left + s.left,
      },
    }))
  }

  // Druecken und ziehen: ab der Schwelle wird der Klick zum Umordnen. Ohne
  // Bewegung ist das Loslassen der Klick auf die Spalte.
  const beiDruck = (index: number, e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.stopPropagation()
    const rahmen = wirt.current
    if (!rahmen) return
    // Ein Klick auf eine Spalte eines noch nicht gewaehlten Bausteins waehlt
    // ihn nur; der Waehler geht erst am gewaehlten auf.
    const warGewaehlt = editor.selectedId === block.id
    const startX = e.clientX
    const bezugLinks = rahmen.getBoundingClientRect().left
    const mitten = stellen.map((s) => bezugLinks + s.left + s.width / 2)
    let zieht = false
    let slot = index
    const slotVon = (x: number): number => {
      for (let i = 0; i < mitten.length; i++) if (x < mitten[i]) return i
      return mitten.length
    }
    const aufraeumen = (): void => {
      window.removeEventListener('pointermove', beiBewegung)
      window.removeEventListener('pointerup', beiEnde)
      window.removeEventListener('pointercancel', beiAbbruch)
      window.removeEventListener('blur', beiAbbruch)
      window.removeEventListener('keydown', beiTaste, true)
      if (zieht) document.body.style.cursor = ''
      setZug(null)
    }
    function beiBewegung(ev: PointerEvent): void {
      if (!zieht) {
        if (Math.abs(ev.clientX - startX) < ZUG_SCHWELLE) return
        zieht = true
        document.body.style.cursor = 'grabbing'
      }
      ev.preventDefault()
      slot = slotVon(ev.clientX)
      setZug({ von: index, slot })
    }
    function beiEnde(): void {
      const war = zieht
      const s = slot
      aufraeumen()
      if (!war) {
        if (warGewaehlt) oeffnePicker(index)
        else onSelect?.()
        return
      }
      const verschieben = bindung.eintragVerschieben
      if (!verschieben) return
  // Beide Zahlen im selben Raum: der Platz in der vollen Liste.
      const von = stellen[index]?.platz ?? index
      const nachRoh = stellen[s]?.platz ?? (stellen[stellen.length - 1]?.platz ?? 0) + 1
      wendeProps(editor, block.id, verschieben(block.props, von, nachRoh > von ? nachRoh - 1 : nachRoh))
    }
    function beiAbbruch(): void {
      aufraeumen()
    }
    function beiTaste(ev: KeyboardEvent): void {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      aufraeumen()
    }
    window.addEventListener('pointermove', beiBewegung)
    window.addEventListener('pointerup', beiEnde)
    window.addEventListener('pointercancel', beiAbbruch)
    window.addEventListener('blur', beiAbbruch)
    window.addEventListener('keydown', beiTaste, true)
  }

  if (stellen.length === 0) return null
  const erste = stellen[0]
  const letzte = stellen[stellen.length - 1]
  const linie = zug === null
    ? null
    : zug.slot < stellen.length ? stellen[zug.slot].left : letzte.left + letzte.width

  return (
    <div data-ff-editor-helper className="pointer-events-none absolute inset-0 z-10">
      {stellen.map((s, i) => (
        <div
          key={i}
          className={cn(
            'pointer-events-auto absolute cursor-pointer hover:bg-[hsl(var(--wb-auswahl)/0.10)]',
            zug?.von === i && 'bg-[hsl(var(--wb-auswahl)/0.10)]',
          )}
          style={{
            left: s.left + GRIFF_RAND,
            top: s.top,
            width: Math.max(0, s.width - 2 * GRIFF_RAND),
            height: s.height,
          }}
          title="Klick: Feld und Einstellungen der Spalte · Ziehen: Spalte verschieben"
          onPointerDown={(e) => beiDruck(i, e)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      ))}
      {linie !== null && (
        <div
          className="absolute w-[3px] rounded-[1px] bg-[hsl(var(--wb-auswahl))]"
          style={{ left: linie - 1, top: erste.top, height: erste.height }}
        />
      )}
    </div>
  )
}
