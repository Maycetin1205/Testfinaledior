import { Component } from '@/editor/icons/icon'
import { createElement } from 'react'
import { ROOT_ID, ROOT_TYPE } from '../../core/block/tree'
import { mayContain, allBlockTypes } from '../../core/block/registry'
import type { Category, BlockType } from '../../core/block/blockType'
import { BLOCK_ICONS } from '../blockIcons'
import { setNewBlockDrag } from '../canvas/dnd'
import { capacityOf } from '../canvas/gridArea'
import { useEditor } from '../state/useEditor'

function symbolOf(type: string) {
  return BLOCK_ICONS[type] ?? Component
}

const CATEGORY_ORDER: Category[] = ['layout', 'input', 'display']

// The blocks as the dark strip of the reception mask's navigation: a click adds
// one, a drag lays it where it lands.
export function BlockPalette() {
  const ed = useEditor()

  const definitions = allBlockTypes()
    .filter((d) => d.inPalette !== false)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))

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
    <nav className="flex flex-col gap-[2px] px-[2px] py-[6px]">
      {definitions.map((def) => (
        <PaletteItem
          key={def.type}
          def={def}
          onAdd={() => {
            const parentId = insertParentFor(def.type)
            ed.addBlock(def.type, parentId, undefined, capacityOf(ed.tree, parentId))
          }}
        />
      ))}
    </nav>
  )
}

interface PaletteItemProps {
  def: BlockType
  onAdd: () => void
}

function PaletteItem({ def, onAdd }: PaletteItemProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      draggable
      onDragStart={(e) => {
        setNewBlockDrag(e.dataTransfer, def.type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="flex w-full min-w-0 flex-col items-center gap-[4px] rounded py-[8px] text-[hsl(var(--wb-nav-ink))] transition-colors hover:bg-[hsl(var(--wb-nav-hover))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {createElement(symbolOf(def.type), { size: 20 })}
      <span className="w-full truncate text-center text-label">{def.name}</span>
    </button>
  )
}
