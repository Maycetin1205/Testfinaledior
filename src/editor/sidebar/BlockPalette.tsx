// Die Palette: alle Bausteine, die man auf die Flaeche ziehen kann.
import { Component, Plus, Search, type Zeichen } from '@/editor/zeichen/zeichen'
import { createElement, useState } from 'react'
import { Feld } from '@/editor/werkbank/Feld'
import { Gruppe } from '@/editor/werkbank/Gruppe'
import { Knopf } from '@/editor/werkbank/Knopf'
import { WURZEL_ID, WURZEL_TYP } from '../../kern/maske/baum'
import { darfEnthalten, alleBausteinArten } from '../../kern/maske/registry'
import type { Kategorie, BausteinArt } from '../../kern/maske/bausteinArt'
import { editorAngabenVon } from '../../kern/maske/editorAngaben'
import { setNewBlockDrag } from '../canvas/dnd'
import { kapazitaetVon } from '../canvas/rasterFlaeche'
import { useEditor } from '../zustand/useEditor'

const ERSATZ_SYMBOL = Component

function symbolVon(type: string): Zeichen {
  return (editorAngabenVon(type).symbol ?? ERSATZ_SYMBOL) as Zeichen
}

const CATEGORY_LABEL: Record<Kategorie, string> = {
  layout: 'Layout',
  eingabe: 'Eingabe',
  anzeige: 'Anzeige',
}

const CATEGORY_ORDER: Kategorie[] = ['layout', 'eingabe', 'anzeige']

export function BlockPalette() {
  const ed = useEditor()
  const [query, setQuery] = useState('')

  const definitions = alleBausteinArten().filter((d) => d.inPalette !== false)

  const q = query.trim().toLowerCase()
  const filtered = definitions.filter((d) => {
    if (!q) return true
    return d.name.toLowerCase().includes(q)
      || d.typ.toLowerCase().includes(q)
      || d.tag.toLowerCase().includes(q)
  })

  const grouped: Record<Kategorie, BausteinArt[]> = {
    layout: [],
    eingabe: [],
    anzeige: [],
  }
  for (const def of filtered) grouped[def.kategorie]?.push(def)

  const insertParentFor = (type: string): string | undefined => {
    let cur = ed.selectedId ? ed.getNode(ed.selectedId) : null
    while (cur) {
      if (darfEnthalten(cur.typ, type)) return cur.id
      cur = cur.elternId ? ed.getNode(cur.elternId) : null
    }

    const aktiveSeite = ed.getNode(ed.rootId)
    if (aktiveSeite && !darfEnthalten(aktiveSeite.typ, type) && darfEnthalten(WURZEL_TYP, type)) {
      return WURZEL_ID
    }
    return undefined
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex items-center">
        <Search size={13} aria-hidden className="absolute left-2 text-matt" />
        <Feld
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Baustein suchen…"
          aria-label="Baustein suchen"
          className="pl-7"
        />
      </label>

      {filtered.length === 0 && <p className="text-ui text-matt">Keine Treffer.</p>}

      {CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0).map((cat) => (
        <Gruppe key={cat} titel={CATEGORY_LABEL[cat]}>
          <div className="flex flex-col gap-1">
            {grouped[cat].map((def) => (
              <PaletteKarte
                key={def.typ}
                def={def}
                onAdd={() => {
                  const parentId = insertParentFor(def.typ)
                  ed.addBlock(def.typ, parentId, undefined, kapazitaetVon(ed.tree, parentId))
                }}
              />
            ))}
          </div>
        </Gruppe>
      ))}
    </div>
  )
}

interface PaletteKarteProps {
  def: BausteinArt
  onAdd: () => void
}

function PaletteKarte({ def, onAdd }: PaletteKarteProps) {
  return (
    <Knopf
      onClick={onAdd}
      draggable
      onDragStart={(e) => {
        setNewBlockDrag(e.dataTransfer, def.typ)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] gap-2 px-2 text-left hover:border-akzent"
    >
      <span className="flex shrink-0 items-center text-matt group-hover:text-tinte">
        {createElement(symbolVon(def.typ), { size: 15 })}
      </span>
      <span className="truncate">{def.name}</span>
      <span className="flex shrink-0 items-center text-matt opacity-0 transition-opacity group-hover:opacity-100">
        <Plus size={13} />
      </span>
    </Knopf>
  )
}
