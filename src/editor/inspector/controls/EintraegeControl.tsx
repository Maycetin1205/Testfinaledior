// Eine Liste von Eintraegen im Inspector: je Eintrag dieselben Bedienelemente.
import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'
import { Knopf } from '@/editor/werkbank/Knopf'
import { eigenschaftSichtbar, type Eigenschaft } from '../../../kern/maske/eigenschaft'
import type { Datenquelle } from '../../../kern/daten/datenquellen'
import { ColorTileControl } from './ColorTileControl'
import { KachelControl } from './KachelControl'
import { PickerControl } from './PickerControl'
import { SelectControl } from './SelectControl'
import { TextControl } from './TextControl'

type Eintrag = Record<string, unknown>

interface EintraegeControlProps {
  property: Eigenschaft
  value: unknown
  onChange: (eintraege: Eintrag[]) => void
  feldQuelle: Datenquelle | undefined
  onBeginBearbeitung: () => void
  onEndeBearbeitung: () => void
}

function eintraegeAus(value: unknown): Eintrag[] {
  return Array.isArray(value)
    ? value.map((x) => (x && typeof x === 'object' ? x as Eintrag : {}))
    : []
}

export function EintraegeControl(props: EintraegeControlProps) {
  const { property, value, onChange, feldQuelle } = props
  const [offen, setOffen] = useState<number | null>(null)
  const eintraege = eintraegeAus(value)
  const name = property.eintragName ?? 'Eintrag'
  const titelVon = (e: Eintrag, i: number): string => {
    const t = property.titelSchluessel ? e[property.titelSchluessel] : undefined
    return typeof t === 'string' && t.trim() !== '' ? t : `${name} ${i + 1}`
  }

  // Ein Ja/Nein, das nur einer tragen darf: das neue „ja“ nimmt es den anderen.
  const setze = (at: number, teil: Eigenschaft, wert: unknown): void => {
    const an = teil.optionen?.[1]?.wert ?? 'ja'
    const aus = teil.optionen?.[0]?.wert ?? 'nein'
    const einzig = teil.einzigUnterGeschwistern === true && wert === an
    onChange(eintraege.map((e, i) => {
      if (i === at) return { ...e, [teil.schluessel]: wert }
      return einzig && e[teil.schluessel] === an ? { ...e, [teil.schluessel]: aus } : e
    }))
  }

  const verschiebe = (von: number, nach: number): void => {
    const neu = [...eintraege]
    const [e] = neu.splice(von, 1)
    neu.splice(nach, 0, e)
    onChange(neu)
    setOffen(nach)
  }

  const bedienung = (e: Eintrag, at: number, teil: Eigenschaft) => {
    if (!eigenschaftSichtbar(teil.wenn, e)) return null
    const wert = e[teil.schluessel]
    const setzeWert = (v: unknown) => setze(at, teil, v)
    switch (teil.art) {
      case 'text':
        return <TextControl key={teil.schluessel} property={teil} value={String(wert ?? '')}
          onChange={setzeWert} onBeginBearbeitung={props.onBeginBearbeitung} onEndeBearbeitung={props.onEndeBearbeitung} />
      case 'jaNein':
        return <KachelControl key={teil.schluessel} property={teil} value={wert} onChange={setzeWert} />
      case 'select': {
        const gemeinsam = {
          label: teil.name,
          description: teil.beschreibung,
          options: teil.optionen ?? [],
          value: String(wert ?? ''),
          onChange: setzeWert,
        }
        return (teil.optionen ?? []).every((o) => o.farbe !== undefined)
          ? <ColorTileControl key={teil.schluessel} {...gemeinsam} />
          : <SelectControl key={teil.schluessel} {...gemeinsam} />
      }
      case 'field':
        if (!feldQuelle) {
          return <p key={teil.schluessel} className="text-dicht text-matt">{teil.name}: zuerst eine Datenquelle verbinden.</p>
        }
        return (
          <PickerControl
            key={teil.schluessel}
            label={teil.name}
            hinweis={teil.beschreibung}
            bezeichnung={`Feld für ${teil.name}`}
            gruppen={[{
              key: 'felder',
              eintraege: feldQuelle.felder.map((f) => ({ wert: f.code, name: f.name, kennung: f.code })),
            }]}
            wert={typeof wert === 'string' ? wert : ''}
            leerText="Nicht gebunden"
            onWaehle={setzeWert}
          />
        )
      case 'eintraege':
        return (
          <div key={teil.schluessel} className="flex flex-col gap-1">
            <span className="text-ui text-matt" title={teil.beschreibung}>{teil.name}</span>
            <EintraegeControl {...props} property={teil} value={wert} onChange={setzeWert} />
          </div>
        )
      default:
        return null
    }
  }

  const mindestens = property.min ?? 0
  return (
    <div className="flex flex-col gap-1">
      {eintraege.map((e, at) => {
        const auf = offen === at
        return (
          <div key={at} className="flex flex-col rounded border border-linie">
            <div className="flex items-center gap-0.5 pr-0.5">
              <button
                type="button"
                aria-expanded={auf}
                className="flex h-steuer min-w-0 flex-1 items-center gap-1 px-1.5 text-left text-ui text-tinte"
                onClick={() => setOffen(auf ? null : at)}
              >
                <ChevronDown size={12} className={cn('shrink-0 transition-transform', !auf && '-rotate-90')} />
                <span className="truncate">{titelVon(e, at)}</span>
              </button>
              <Knopf nurZeichen aria-label={`${titelVon(e, at)} nach vorn`} disabled={at === 0}
                onClick={() => verschiebe(at, at - 1)}><ArrowUp size={12} /></Knopf>
              <Knopf nurZeichen aria-label={`${titelVon(e, at)} nach hinten`} disabled={at === eintraege.length - 1}
                onClick={() => verschiebe(at, at + 1)}><ArrowDown size={12} /></Knopf>
              <Knopf nurZeichen art="gefahr" aria-label={`${titelVon(e, at)} entfernen`}
                disabled={eintraege.length <= mindestens}
                onClick={() => { onChange(eintraege.filter((_, i) => i !== at)); setOffen(null) }}>
                <Trash2 size={12} />
              </Knopf>
            </div>
            {auf && (
              <div className="flex flex-col gap-2 border-t border-linie p-1.5">
                {(property.eintrag ?? []).map((teil) => bedienung(e, at, teil))}
              </div>
            )}
          </div>
        )
      })}
      <Knopf
        className="self-start"
        onClick={() => {
          onChange([...eintraege, property.neuerEintrag?.() ?? {}])
          setOffen(eintraege.length)
        }}
      >
        <Plus size={13} /> {name}
      </Knopf>
    </div>
  )
}
