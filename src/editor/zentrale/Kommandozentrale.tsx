// Das Datencenter: Datenquellen und Relationen der Maske.
import { useRef, useState } from 'react'
import { Database, FolderOpen, Link2, Save } from '@/editor/zeichen/zeichen'
import { Dialog } from '@/editor/werkbank/Dialog'
import { Eintrag } from '@/editor/werkbank/Eintrag'
import { Knopf } from '@/editor/werkbank/Knopf'
import { ladeBibliothekAusDatei, speichereBibliothekAlsDatei } from '../zustand/bibliothekDatei'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'
import { useRelations } from '../zustand/useRelations'
import { DatenquellenBereich } from './DatenquellenBereich'
import { RelationenBereich } from './RelationenBereich'

type Bereich = 'datenquellen' | 'relationen'

const BEREICHE: ReadonlyArray<{ key: Bereich; name: string; icon: typeof Database }> = [
  { key: 'datenquellen', name: 'Datenquellen', icon: Database },
  { key: 'relationen', name: 'Relationen', icon: Link2 },
]

export function Kommandozentrale({ onClose }: { onClose: () => void }) {
  const [bereich, setBereich] = useState<Bereich>('datenquellen')
  const sources = useDataSources()
  const relations = useRelations()

  const navZahl: Record<Bereich, string> = {
    datenquellen: String(sources.list.length),
    relationen: String(relations.list.length),
  }

  const bereichsleiste = (
    <>
      {BEREICHE.map(({ key, name, icon }) => (
        <Eintrag
          key={key}
          icon={icon}
          name={name}
          aktiv={bereich === key}
          onClick={() => setBereich(key)}
          rechts={(
            <span className="shrink-0 text-dicht tabular-nums text-matt">{navZahl[key]}</span>
          )}
        />
      ))}
    </>
  )

  return (
    <Dialog randlos titel="Datencenter" aktionen={<BibliothekAktionen />} onClose={onClose}>
      {bereich === 'datenquellen' && <DatenquellenBereich bereiche={bereichsleiste} />}
      {bereich === 'relationen' && <RelationenBereich bereiche={bereichsleiste} />}
    </Dialog>
  )
}

// Beide Listen zusammen als eigene Datei, ohne Bausteine. Ohne Rueckfrage:
// Laden ergaenzt nur, und Strg+Z nimmt es zurueck.
function BibliothekAktionen() {
  const ed = useEditor()
  const dateiRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={dateiRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const datei = e.target.files?.[0]
          try {
            if (datei) void ladeBibliothekAusDatei(ed, datei)
          } finally {
            e.target.value = ''
          }
        }}
      />
      <Knopf
        title="Datenquellen und Relationen als eigene Datei speichern — ohne die Bausteine"
        onClick={() => speichereBibliothekAlsDatei(ed)}
      >
        <Save size={14} /> Bibliothek speichern
      </Knopf>
      <Knopf
        title="Datenquellen und Relationen aus einer Bibliotheksdatei ergänzen — nichts wird gelöscht"
        onClick={() => dateiRef.current?.click()}
      >
        <FolderOpen size={14} /> Bibliothek laden…
      </Knopf>
    </>
  )
}
