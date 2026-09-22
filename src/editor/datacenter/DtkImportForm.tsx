import { useState } from 'react'
import { cn } from '@/editor/widgets/cn'
import { Checkbox } from '@/editor/widgets/Checkbox'
import { Button } from '@/editor/widgets/PushButton'
import { keyDisplay } from '../../core/data/dataSources'
import type { DtkTable } from '../../core/data/dtkImport'
import { useDataSources } from '../state/useDataSources'
import { FormCard } from './FormCard'

interface DtkImportFormProps {
  fileName: string
  tables: DtkTable[]

  failuresBase?: string
  onClose: () => void
}

export function DtkImportForm({ fileName, tables, failuresBase, onClose }: DtkImportFormProps) {
  const store = useDataSources()

  const present = new Set(
    store.list.map((s) => s.idbId).filter((k): k is string => typeof k === 'string'),
  )

  const [ticked, setTicked] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        tables
          .filter((t) => !present.has(t.key) && t.fields.length > 0)
          .map((t) => t.key),
      ),
  )

  function toggle(key: string) {
    setTicked((old) => {
      const next = new Set(old)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function adopt() {
    for (const t of tables) {
      if (!ticked.has(t.key) || present.has(t.key)) continue
      store.add({
        name: t.name !== '' ? t.name : keyDisplay(t.key),
        kind: 'idb',
        idbId: t.key,

        recordField: '0_10',
        fields: t.fields,
      })
    }
    onClose()
  }

  function hint(t: DtkTable): string {
    if (present.has(t.key)) return 'schon in der Bibliothek — wird übersprungen'
    if (t.fields.length === 0) return 'keine Felder lesbar — nach dem Import von Hand eintragen'
    if (t.should > t.fields.length) {
      return `nur ${t.fields.length} von ${t.should} Feldern lesbar — Rest von Hand ergänzen`
    }
    if (t.should > 0 && t.fields.length > t.should) {
      return `${t.fields.length} Felder gelesen, die Zählung nennt ${t.should} — in SoftEngine gegenprüfen`
    }
    return ''
  }

  const count = [...ticked].filter((k) => !present.has(k)).length

  return (
    <FormCard title={`Import aus ${fileName}`} onClose={onClose}>
      <div className="flex flex-col gap-3 text-ui">
        {tables.length === 0 ? (
          <p className="rounded border border-fehler/40 bg-fehler/10 px-2.5 py-2 text-fehler">
            Keine IDB-Tabellen gefunden. Ist das ein SoftEngine-IDB-Export
            (in SoftEngine: „IDB exportieren“, Dateiendung .DTK)?
            {failuresBase && <><br />Die Datei liess sich nicht lesen: {failuresBase}</>}
          </p>
        ) : (
          <>
            <p className="text-matt">
              {tables.length} Tabellen gefunden. Angehakte werden als
              IDB-Datenquellen angelegt — Felder samt Klarnamen inklusive.
            </p>
            <div className="overflow-hidden rounded border border-linie">
              {tables.map((t) => {
                const locked = present.has(t.key)
                const row = hint(t)
                return (
                  <Checkbox
                    key={t.key}
                    checked={!locked && ticked.has(t.key)}
                    disabled={locked}
                    onChange={() => toggle(t.key)}
                    className={cn(
                      'border-b border-linie px-2.5 py-1.5 last:border-b-0',
                      !locked && 'hover:bg-control',
                    )}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="truncate font-medium text-tinte">
                        {t.name !== '' ? t.name : keyDisplay(t.key)}
                      </span>
                      <span className="shrink-0 font-mono text-dicht text-matt">
                        {keyDisplay(t.key)}
                      </span>
                    </span>
                    <span className="block text-dicht text-matt">
                      {t.fields.length} Felder
                      {row !== '' ? ` · ${row}` : ''}
                    </span>
                  </Checkbox>
                )
              })}
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 border-t border-linie pt-3">
          <Button onClick={onClose}>Abbrechen</Button>
          {tables.length > 0 && (
            <Button kind="primary" disabled={count === 0} onClick={adopt}>
              {count === 1 ? '1 Tabelle übernehmen' : `${count} Tabellen übernehmen`}
            </Button>
          )}
        </div>
      </div>
    </FormCard>
  )
}
