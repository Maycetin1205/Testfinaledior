// Waehlt zu einer Baustein-Eigenschaft das passende Bedienelement.
import type { Baustein } from '../../kern/maske/baum'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import type { Eigenschaft } from '../../kern/maske/eigenschaft'
import { quellenKennung, type Datenquelle } from '../../kern/daten/datenquellen'
import { useDataSources } from '../zustand/useDataSources'
import { useRelations } from '../zustand/useRelations'
import { useEditor } from '../zustand/useEditor'
import type { ListeGruppe } from '@/editor/werkbank/Liste'
import { KachelControl } from './controls/KachelControl'
import { ColorTileControl } from './controls/ColorTileControl'
import { NumberControl } from './controls/NumberControl'
import { PickerControl } from './controls/PickerControl'
import { SegmentControl } from './controls/SegmentControl'
import { SelectControl } from './controls/SelectControl'
import { TextareaControl } from './controls/TextareaControl'
import { TextControl } from './controls/TextControl'

// Die zwei Rueckrufe, die der Inspector durchreicht: sie klammern eine Eingabe zu
// EINEM Undo-Schritt. Nicht zu verwechseln mit der Eingabesitzung, dem Hook, der
// sie fuer ein einzelnes Feld auf- und zumacht.
export interface BearbeitungsRueckrufe {
  onBeginBearbeitung: () => void
  onEndeBearbeitung: () => void
}

export interface PropControlProps {
  block: Baustein
  property: Eigenschaft

  sourceInReach: Datenquelle | undefined
  sitzung: BearbeitungsRueckrufe

  kompakt?: boolean
}

interface WaehlerFall {
  nenner: string
  gruppen: ListeGruppe[]
  wert: string
  leerText: string
  onWaehle: (wert: string) => void
}

export function PropControl({
  block,
  property,
  sourceInReach,
  sitzung,
  kompakt = false,
}: PropControlProps) {
  const ed = useEditor()

  const relations = useRelations()

  const quellen = useDataSources()
  const def = bausteinArt(block.typ)

  const value = block.werte[property.schluessel]
  const kind = property.art
  const set = (v: unknown) => ed.updateProperty(block.id, property.schluessel, v)

  const feldQuelle = property.quelleProp
    ? quellen.get(String(block.werte[property.quelleProp] ?? ''))
    : sourceInReach

  if (kompakt) {
    if (kind === 'number') {
      return <NumberControl property={property} value={value} onChange={set} {...sitzung} />
    }
    if (kind === 'segment') {
      return (
        <SegmentControl
          name={property.name}
          description={property.beschreibung}
          options={property.optionen ?? []}
          value={String(value ?? '')}
          onChange={set}
        />
      )
    }
  }

  if (property.brauchtQuelle && !sourceInReach) return null
  if (kind === 'field' && !feldQuelle) {
    return <p className="text-dicht text-matt">{property.name}: zuerst eine passende Datenquelle verbinden.</p>
  }

  // Erst NACH den Sperren oben: eine Kachel ohne Datenquelle waere ein Schalter
  // fuer etwas, das es nicht gibt.
  if (kind === 'jaNein') {
    return <KachelControl property={property} value={value} onChange={set} />
  }

  const waehlerFall = (): WaehlerFall | undefined => {
    switch (kind) {
      case 'quelle':
        return {
          nenner: 'Quelle',
          gruppen: [{
            key: 'quellen',
            eintraege: quellen.list.map((q) => ({
              wert: q.id,
              name: q.name,
              kennung: quellenKennung(q),
            })),
          }],
          wert: typeof value === 'string' ? value : '',
          leerText: 'Keine',
          onWaehle: (neueId) => {
            if (neueId === String(value ?? '')) return

            ed.transaktion(() => {
              set(neueId)

              for (const andere of def?.eigenschaften ?? []) {
                if (andere.quelleProp !== property.schluessel) continue
                ed.updateProperty(block.id, andere.schluessel, '')
                if (andere.klarnameProp) {
                  ed.updateProperty(block.id, andere.klarnameProp, '')
                }
              }
  // Auch eine Liste, die ihre Feldcodes aus DIESER Quelle nimmt, zeigt nach dem
  // Wechsel ins Leere: sie behielte sonst Codes der alten Quelle.
              const liste = faehigkeit(def, 'liste')?.bindung
              const alteListe = liste ? block.werte[liste.prop] : undefined
              if (liste?.quelleProp === property.schluessel
                && Array.isArray(alteListe) && alteListe.length > 0) {
                ed.updateProperty(block.id, liste.prop, [])
              }
            })
          },
        }

      case 'field':
        return {
          nenner: 'Feld',
          gruppen: [{
            key: 'felder',
            name: feldQuelle?.name,
            kennung: feldQuelle ? quellenKennung(feldQuelle) : undefined,
            eintraege: (feldQuelle?.felder ?? []).map((f) => ({
              wert: f.code,
              name: f.name,
              kennung: f.code,
            })),
          }],
          wert: value == null ? '' : String(value),
          leerText: 'Nicht gebunden',
          onWaehle: (code) => {
            ed.transaktion(() => {
              set(code)

              if (property.klarnameProp) {
                const klarname = feldQuelle?.felder.find((f) => f.code === code)?.name ?? ''
                ed.updateProperty(block.id, property.klarnameProp, klarname)
              }
            })
          },
        }

      case 'seite': {
        const seiten = ed.pages.filter((s) => s.istFlaeche)
        return {
          nenner: 'Seite',
          gruppen: [{
            key: 'seiten',
            eintraege: seiten.map((s) => ({ wert: s.id, name: s.name })),
          }],
          wert: typeof value === 'string' ? value : '',
          leerText: 'Keine',
          onWaehle: (id) => {
            ed.transaktion(() => {
              set(id)
              if (property.klarnameProp) {
                ed.updateProperty(block.id, property.klarnameProp,
                  seiten.find((s) => s.id === id)?.name ?? '')
              }
            })
          },
        }
      }

      case 'relation':
        return {
          nenner: 'Relation',
          gruppen: [{
            key: 'relationen',
            eintraege: relations.list.map((r) => ({
              wert: r.id,
              name: r.name,
              kennung: r.nr,
            })),
          }],
          wert: typeof value === 'string' ? value : '',
          leerText: 'Keine',
          onWaehle: set,
        }

      default:
        return undefined
    }
  }

  const fall = waehlerFall()
  if (fall) {
    const { nenner, ...rest } = fall
    return (
      <PickerControl
        label={property.name}
        hinweis={property.beschreibung}
        bezeichnung={`${nenner} für ${property.name}`}
        {...rest}
      />
    )
  }

  switch (kind) {
    case 'text':
      return <TextControl property={property} value={String(value ?? '')} onChange={set} {...sitzung} />
    case 'textarea':
      return <TextareaControl property={property} value={String(value ?? '')} onChange={set} {...sitzung} />

    case 'number':
      return <NumberControl label={property.name} property={property} value={value} onChange={set} {...sitzung} />
    case 'segment':
      return (
        <SegmentControl
          label={property.name}
          name={property.name}
          description={property.beschreibung}
          options={property.optionen ?? []}
          value={String(value ?? '')}
          onChange={set}
        />
      )
    case 'select': {
      const opts = property.optionen ?? []
      const gemeinsam = {
        label: property.name,
        description: property.beschreibung,
        options: opts,
        value: String(value ?? ''),
        onChange: set,
      }

      // Kacheln nur, wenn jede Option ihre Farbe mitbringt; sonst die Liste.
      return opts.length > 0 && opts.every((o) => o.farbe !== undefined)
        ? <ColorTileControl {...gemeinsam} />
        : <SelectControl {...gemeinsam} />
    }
    default:
      return null
  }
}
