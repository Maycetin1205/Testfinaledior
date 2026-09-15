// Die Reiter der Seiten und Ansichten ueber der Leinwand.
import { Trash } from '@/editor/zeichen/zeichen'
import { Fragment, useState } from 'react'
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Reiter } from '@/editor/werkbank/Reiter'
import { alleBausteinArten } from '../../kern/maske/registry'
import { loescheBaustein } from '../zustand/loescheBaustein'
import { useEditor } from '../zustand/useEditor'

export function SeitenLeiste() {
  const ed = useEditor()
  const pages = ed.pages
  const aktiv = ed.activePageId

  const [umbenennen, setUmbenennen] = useState<{ id: string; text: string } | null>(null)
  const seitenArten = alleBausteinArten().filter((def) => def.pageBlock)

  const uebernehmen = () => {
    if (!umbenennen) return
    const name = umbenennen.text.trim()
    if (name !== '') ed.updateProperty(umbenennen.id, 'name', name)
    setUmbenennen(null)
  }

  return (
    <div
      className="flex max-w-[44vw] items-center gap-0.5 overflow-x-auto rounded border border-linie bg-control p-0.5"
      data-ff-editor-helper
    >
      {pages.map((p) => (
        umbenennen?.id === p.id ? (
          <Feld
            key={p.id}
            autoFocus
            aria-label="Seitenname"
            value={umbenennen.text}
            onChange={(e) => setUmbenennen({ id: p.id, text: e.target.value })}
            onBlur={uebernehmen}
            onKeyDown={(e) => {
              if (e.key === 'Enter') uebernehmen()
              if (e.key === 'Escape') setUmbenennen(null)
            }}
            className="h-6 w-32 shrink-0"
          />
        ) : (
          <Fragment key={p.id}>
            <Reiter
              aktiv={p.id === aktiv}
              onClick={() => ed.setActivePage(p.id)}
              onDoubleClick={() => {
                if (!p.istHauptseite) setUmbenennen({ id: p.id, text: p.name })
              }}
              title={p.istHauptseite ? undefined : 'Doppelklick: umbenennen'}
            >
              {p.name}
            </Reiter>
            {p.id === aktiv && !p.istHauptseite && (
              <Knopf
                nurZeichen
                title="Seite löschen (Strg+Z stellt sie zurück)"
                aria-label={`Seite ${p.name} löschen`}
                onClick={() => loescheBaustein(ed, p.id)}
                className="h-6 w-auto rounded-l-none bg-akzent/15 pr-1.5 hover:bg-akzent/15 hover:text-fehler"
              >
                <Trash size={12} />
              </Knopf>
            )}
          </Fragment>
        )
      ))}
      {seitenArten.map((def) => (
        <Reiter
          key={def.type}
          onClick={() => ed.addSeite(def.type)}
          title={`Neue Seite anlegen: ${def.displayName}`}
        >
          ＋ {def.displayName}
        </Reiter>
      ))}
    </div>
  )
}
