import { Component, Plus, Search } from '@/editor/icons/icon'
import { createElement, useState } from 'react'
import { Field } from '@/editor/widgets/Field'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/Button'
import { ROOT_ID, ROOT_TYPE } from '../../core/block/tree'
import { mayContain, allBlockTypes } from '../../core/block/registry'
import type { Category, BlockType } from '../../core/block/blockType'
import { BLOCK_ICONS, type BlockIcon } from '../blockIcons'
import { setNewBlockDrag } from '../canvas/dnd'
import { capacityOf } from '../canvas/gridArea'
import { useEditor } from '../state/useEditor'

const REPLACEMENT_SYMBOL: BlockIcon = (properties) => createElement(Component, properties)

function symbolOf(type: string): BlockIcon {
  return BLOCK_ICONS[type] ?? REPLACEMENT_SYMBOL
}

const CATEGORY_LABEL: Record<Category, string> = {
  layout: 'Layout',
  input: 'Eingabe',
  display: 'Anzeige',
}

const CATEGORY_ORDER: Category[] = ['layout', 'input', 'display']

export function BlockPalette() {
  const ed = useEditor()
  const [query, setQuery] = useState('')

  const definitions = allBlockTypes().filter((d) => d.inPalette !== false)

  const q = query.trim().toLowerCase()
  const filtered = definitions.filter((d) => {
    if (!q) return true
    return d.name.toLowerCase().includes(q)
      || d.type.toLowerCase().includes(q)
      || d.tag.toLowerCase().includes(q)
  })

  const grouped: Record<Category, BlockType[]> = {
    layout: [],
    input: [],
    display: [],
  }
  for (const def of filtered) grouped[def.category]?.push(def)

  const insertParentFor = (type: string): string | undefined => {
    let cur = ed.selectedId ? ed.getNode(ed.selectedId) : null
    while (cur) {
      if (mayContain(cur.type, type)) return cur.id
      cur = cur.parentId ? ed.getNode(cur.parentId) : null
    }

    const activePage = ed.getNode(ed.rootId)
    if (activePage && !mayContain(activePage.type, type) && mayContain(ROOT_TYPE, type)) {
      return ROOT_ID
    }
    return undefined
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex items-center">
        <Search size={13} aria-hidden className="absolute left-2 text-muted" />
        <Field
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Baustein suchen…"
          aria-label="Baustein suchen"
          className="pl-7"
        />
      </label>

      {CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0).map((cat) => (
        <Group key={cat} title={CATEGORY_LABEL[cat]}>
          <div className="flex flex-col gap-1">
            {grouped[cat].map((def) => (
              <PaletteCard
                key={def.type}
                def={def}
                onAdd={() => {
                  const parentId = insertParentFor(def.type)
                  ed.addBlock(def.type, parentId, undefined, capacityOf(ed.tree, parentId))
                }}
              />
            ))}
          </div>
        </Group>
      ))}
    </div>
  )
}

interface PaletteCardProps {
  def: BlockType
  onAdd: () => void
}

function PaletteCard({ def, onAdd }: PaletteCardProps) {
  return (
    <Button
      onClick={onAdd}
      draggable
      onDragStart={(e) => {
        setNewBlockDrag(e.dataTransfer, def.type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] gap-2 px-[10px] text-left hover:border-accent hover:bg-panel"
    >
      <span className="flex shrink-0 items-center text-muted group-hover:text-ink">
        {createElement(symbolOf(def.type), { size: 15 })}
      </span>
      <span className="truncate">{def.name}</span>
      <span className="flex shrink-0 items-center text-muted opacity-0 transition-opacity group-hover:opacity-100">
        <Plus size={13} />
      </span>
    </Button>
  )
}
