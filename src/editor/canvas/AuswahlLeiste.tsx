// Die Werkzeugleiste am gewaehlten Baustein: Kind anlegen, Eintrag anfuegen, entfernen.
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link2, Minus, Plus, SlidersHorizontal, Trash2 } from '@/editor/zeichen/zeichen'
import { Knopf } from '@/editor/werkbank/Knopf'
import type { Baustein } from '../../kern/maske/baum'
import { listeLesen, type BausteinArt } from '../../kern/maske/bausteinArt'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { useEditorInstance } from '../zustand/EditorContext'
import { wendeProps } from '../zustand/propsPatch'
import { ersterNachfahreVomTyp, kannRechnen } from '../../kern/maske/baumFragen'
import { eigenschaftenFuer } from '../../kern/maske/eigenschaftsOrt'
import { Popover } from '@/editor/werkbank/Popover'
import { PropControl } from '../inspector/PropControl'
import { oeffneBerechnungenFenster } from './berechnungenStand'

interface AuswahlLeisteProps {
  block: Baustein
  def: BausteinArt | undefined

  wirt: RefObject<HTMLElement | null>

  // Randbausteine (Navi) fuellen die Hoehe: dort liegt die Leiste innen.
  amRand: boolean
  onEntfernen?: () => void
}

type Lage = 'oben' | 'unten' | 'rechts' | 'innen'

// Leiste (24) plus Luft (6), und was sie mindestens an Breite braucht.
const LEISTE = 30
const BREITE = 150

function clipEltern(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement
  while (p) {
    if (getComputedStyle(p).overflow !== 'visible') return p
    p = p.parentElement
  }
  return null
}

// Ueber dem Baustein, sonst darunter, bei schmalem Baustein rechts daneben,
// zuletzt innen unten rechts. Gemessen gegen den naechsten rollenden Vorfahren,
// denn der schneidet jeden Ueberhang ab.
function lageFuer(el: HTMLElement | null, amRand: boolean): Lage {
  if (el === null) return 'innen'
  const r = el.getBoundingClientRect()
  const clip = clipEltern(el)
  const grenze = clip
    ? clip.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight, right: window.innerWidth }
  if (!amRand && r.width >= BREITE) {
    if (r.top - LEISTE >= grenze.top) return 'oben'
    if (r.bottom + LEISTE <= grenze.bottom) return 'unten'
  }
  if (r.width < BREITE && r.right + BREITE <= grenze.right) return 'rechts'
  return 'innen'
}

const STIL: Record<Lage, { top: string; bottom: string; right: string; left: string }> = {
  oben: { top: `${-LEISTE}px`, bottom: 'auto', right: '0px', left: 'auto' },
  unten: { top: 'auto', bottom: `${-LEISTE}px`, right: '0px', left: 'auto' },
  rechts: { top: '4px', bottom: 'auto', right: 'auto', left: 'calc(100% + 6px)' },
  innen: { top: 'auto', bottom: '4px', right: '4px', left: 'auto' },
}

const halt = (e: { stopPropagation: () => void }): void => e.stopPropagation()

// Zeichnete die Tabelle eigene Knoepfe in die Maske, staenden sie bei schmalen
// Spalten ueber den Titeln.
export function AuswahlLeiste({ block, def, wirt, amRand, onEntfernen }: AuswahlLeisteProps) {
  const editor = useEditorInstance()
  const [gestalten, setGestalten] = useState(false)
  const anker = useRef<HTMLButtonElement>(null)
  const sitzung = useMemo(() => ({
    onBeginBearbeitung: () => editor.beginTransaction(),
    onEndeBearbeitung: () => editor.endTransaction(),
  }), [editor])
  const eigenschaften = def ? eigenschaftenFuer(block, def, 'inline') : []
  const muster = def?.templateChild ? ersterNachfahreVomTyp(editor.tree, block.id, def.templateChild.type) : undefined
  // Die Lage wird gemessen und direkt ans Element geschrieben: kein Zustand,
  // kein zweiter Render.
  const leisteRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = leisteRef.current
    if (el) Object.assign(el.style, STIL[lageFuer(wirt.current, amRand)])
  }, [wirt, amRand, block])
  const kind = def?.addChildButton
  const liste = faehigkeit(def, 'liste')?.bindung
  const neu = liste?.eintragNeu
  const weg = liste?.eintragWeg
  const eintragName = liste?.standardTitel.replace(/\s*\{n\}/, '') ?? 'Eintrag'
  const neuMoeglich = neu !== undefined && Object.keys(neu(block.props)).length > 0
  const eintraege = liste ? listeLesen(block.props[liste.prop], liste) : []
  const wegMoeglich = weg !== undefined && eintraege.length > 1

  return (
    <div
      ref={leisteRef}
      data-ff-editor-helper
      className="absolute z-20 flex items-center gap-0.5 rounded-md border border-linie bg-panel p-0.5 shadow-overlay"
      style={STIL.oben}
      onPointerDown={halt}
      onClick={halt}
      onDoubleClick={halt}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {eigenschaften.length > 0 && (
        <Knopf ref={anker} className="h-6 px-1.5 text-dicht"
          aria-expanded={gestalten} aria-haspopup="dialog"
          onClick={() => setGestalten((offen) => !offen)}>
          <SlidersHorizontal size={12} /> Gestalten
        </Knopf>
      )}
      {/* Die Berechnungen gehoeren an den Baustein, dessen Spalten sie rechnen,
          nicht in den Inspector zwischen Quellen, Felder und Ketten. */}
      {kannRechnen(block) && (
        <Knopf className="h-6 px-1.5 text-dicht" title="Berechnungen dieser Erfassung: drei Werte ergeben den vierten"
          onClick={() => oeffneBerechnungenFenster(block.id)}>
          <Link2 size={12} /> Berechnungen
        </Knopf>
      )}
      {muster && (
        <Knopf className="h-6 px-1.5 text-dicht" onClick={() => editor.selectBlock(muster)}>Kartenmuster</Knopf>
      )}
      {onEntfernen && (
        <Knopf nurZeichen className="h-6 w-6" title="Baustein löschen" aria-label="Baustein löschen"
          onClick={onEntfernen}><Trash2 size={12} /></Knopf>
      )}
      {gestalten && (
        <Popover bezeichnung={`${def?.displayName ?? 'Baustein'} gestalten`} anker={anker}
          breite={280} maxHoehe={420} escapeAbfangen onClose={() => setGestalten(false)}>
          <div className="flex flex-col gap-3 p-2">
            <strong className="text-ui">{def?.displayName} gestalten</strong>
            {eigenschaften.map((property) => (
              <PropControl key={property.attributeName} block={block} property={property}
                sourceInReach={editor.dataSourceFor(block.id)} sitzung={sitzung} />
            ))}
          </div>
        </Popover>
      )}
      {kind && (
        <Knopf
          className="h-6 px-1.5 text-dicht"
          title={`${kind.label} anlegen`}
          onClick={() => editor.addBlock(kind.childType, block.id)}
        >
          <Plus size={12} /> {kind.label}
        </Knopf>
      )}
      {neu && (
        <Knopf
          className="h-6 px-1.5 text-dicht"
          title={`${eintragName} anfügen`}
          disabled={!neuMoeglich}
          onClick={() => wendeProps(editor, block.id, neu(block.props))}
        >
          <Plus size={12} /> {eintragName}
        </Knopf>
      )}
      {weg && (
        <Knopf
          className="h-6 px-1.5 text-dicht"
          title={`${eintragName} entfernen`}
          disabled={!wegMoeglich}
          onClick={() => {
            const index = eintraege.length - 1
            if (index >= 0) {
              wendeProps(editor, block.id, weg(block.props, index))
            }
          }}
        >
          <Minus size={12} /> {eintragName}
        </Knopf>
      )}
    </div>
  )
}
