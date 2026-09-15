// Die Wahl einer Relations-Vorlage fuer einen Schritt.
import { useState } from 'react'
import { Search, Share2 } from '@/editor/zeichen/zeichen'
import { Eintrag } from '@/editor/werkbank/Eintrag'
import { Feld } from '@/editor/werkbank/Feld'
import { Marke } from '@/editor/werkbank/Marke'
import {
  relationsSyntaxAlsText,
  relationsGruppe,
  type RelationsGruppe,
  type RelationsVorlage,
} from '../../kern/daten/relationen'
import { SegmentControl } from '../inspector/controls/SegmentControl'
import { istUngetaufteVorlage, relationAnzeige } from './relationAnzeige'
import { RELATION_GRUPPEN, VERB_KURZ } from './helfer'

export function RelationAuswahl({
  label,
  eintraege,
  relationId,
  suche,
  onSuche,
  onSelect,
}: {
  label: string
  eintraege: readonly RelationsVorlage[]
  relationId: string
  suche: string
  onSuche: (value: string) => void
  onSelect: (id: string) => void
}) {
  // Start auf der Gruppe der gewaehlten Relation, sonst auf der nicht-leeren;
  // danach gewinnt der Klick.
  const [tab, setTab] = useState<RelationsGruppe>(() => {
    const gewaehlt = eintraege.find((entry) => entry.id === relationId)
    if (gewaehlt) return relationsGruppe(gewaehlt)
    return eintraege.some((entry) => relationsGruppe(entry) === 'lesen') || eintraege.length === 0
      ? 'lesen'
      : 'schreiben'
  })

  const lesen = eintraege.filter((entry) => relationsGruppe(entry) === 'lesen')
  const schreiben = eintraege.filter((entry) => relationsGruppe(entry) === 'schreiben')
  const zaehler: Record<RelationsGruppe, number> = { lesen: lesen.length, schreiben: schreiben.length }
  const aktiv: RelationsGruppe = tab
  const sichtbar = aktiv === 'lesen' ? lesen : schreiben

  const sucht = suche.trim().length > 0
  const tabOptionen = RELATION_GRUPPEN.map((gruppe) => ({
    ...gruppe,
    label: sucht ? `${gruppe.label} · ${zaehler[gruppe.value as RelationsGruppe]}` : gruppe.label,
  }))
  return (
    <div className="flex flex-col gap-2">
      <span className="text-dicht font-medium">{label}</span>
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-matt" />
        <Feld
          aria-label={`${label} suchen`}
          value={suche}
          placeholder="Name, Nummer oder Syntax"
          className="pl-7"
          onChange={(e) => onSuche(e.target.value)}
        />
      </div>
      <SegmentControl
        name="Lesen oder Schreiben"
        value={aktiv}
        options={tabOptionen}
        onChange={(value) => setTab(value as RelationsGruppe)}
      />

      <div className="max-h-36 overflow-y-auto border-y border-linie p-1">
        {sichtbar.map((entry) => {
          const ungetauft = istUngetaufteVorlage(entry)
          return (
            <Eintrag
              key={entry.id}
              icon={Share2}
              name={relationAnzeige(entry)}
              aktiv={entry.id === relationId}
              onClick={() => onSelect(entry.id)}
              rechts={ungetauft ? undefined : (
                <Marke hinweis={relationsSyntaxAlsText(entry)}>
                  {VERB_KURZ[entry.verb]} {entry.nr}
                </Marke>
              )}
            />
          )
        })}
        {sichtbar.length === 0 && (
          <p className="px-2 py-1 text-dicht text-matt">Keine Treffer.</p>
        )}
      </div>
    </div>
  )
}
