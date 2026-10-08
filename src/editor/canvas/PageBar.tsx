import { Plus, Trash } from '@/editor/icons/icon'
import { Fragment, useState } from 'react'
import { Field } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { Tabs } from '@/editor/widgets/Tabs'
import { allBlockTypes } from '../../core/block/registry'
import { useEditor } from '../state/useEditor'

export function PageBar() {
  const ed = useEditor()
  const pages = ed.pages
  const active = ed.activePageId

  const [rename, setRename] = useState<{ id: string; text: string } | null>(null)
  const pageTypes = allBlockTypes().filter((def) => def.page)

  const adopt = () => {
    if (!rename) return
    const name = rename.text.trim()
    if (name !== '') ed.updateProperty(rename.id, 'name', name)
    setRename(null)
  }

  return (
    <div className="flex shrink-0 items-center gap-[8px]" data-ff-editor-helper>
      {pages.map((p) => (
        rename?.id === p.id ? (
          <Field
            key={p.id}
            autoFocus
            aria-label="Seitenname"
            value={rename.text}
            onChange={(e) => setRename({ id: p.id, text: e.target.value })}
            onBlur={adopt}
            onKeyDown={(e) => {
              if (e.key === 'Enter') adopt()
              if (e.key === 'Escape') setRename(null)
            }}
            className="w-40"
          />
        ) : (
          <Fragment key={p.id}>
            <Tabs
              active={p.id === active}
              title={p.name}
              onClick={() => ed.setActivePage(p.id)}
              onDoubleClick={() => {
                if (!p.isMainPage) setRename({ id: p.id, text: p.name })
              }}
            >
              {p.name}
            </Tabs>
            {p.id === active && !p.isMainPage && (
              <Button
                onlyIcon
                kind="risk"
                title="Seite löschen"
                aria-label={`Seite ${p.name} löschen`}
                onClick={() => ed.removeBlock(p.id)}
              >
                <Trash size={14} />
              </Button>
            )}
          </Fragment>
        )
      ))}
      {pageTypes.map((def) => (
        <Button
          key={def.type}
          onlyIcon
          title={`Neues ${def.name}`}
          aria-label={`Neues ${def.name}`}
          onClick={() => ed.addPage(def.type)}
        >
          <Plus size={14} />
        </Button>
      ))}
    </div>
  )
}
