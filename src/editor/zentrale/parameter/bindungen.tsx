// Die Bedienelemente je Parameter-Herkunft: woraus und was darin.
import type { ReactNode } from 'react'
import { Feld } from '@/editor/werkbank/Feld'
import type { ListeEintrag, ListeGruppe } from '@/editor/werkbank/Liste'
import { PickerControl } from '../../inspector/controls/PickerControl'
import {
  AKTIONS_PLATZHALTER,
  type Parameter,
} from '../../../kern/daten/aktionen'
import {
  quellenKennung,
  type Datenquelle,
  type Datenfeld,
} from '../../../kern/daten/datenquellen'
import { PLATZHALTER_KLARTEXT, blockValueKey } from '../helfer'
import type { BindungsProps } from './wahlen'

const PLATZHALTER_EINTRAEGE: ListeEintrag[] = AKTIONS_PLATZHALTER.map((wert) => ({
  wert,
  name: PLATZHALTER_KLARTEXT[wert]?.name ?? wert,
  kennung: wert,
}))

// Vier Quellen fragen dasselbe zweimal: erst WORAUS, dann WAS DARIN.
function Paar({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>
}

function feldGruppe(felder: readonly Datenfeld[], quelle?: Datenquelle): ListeGruppe {
  return {
    key: 'felder',
    name: quelle?.name,
    kennung: quelle ? quellenKennung(quelle) : undefined,
    eintraege: felder.map((f) => ({ wert: f.code, name: f.label, kennung: f.code })),
  }
}

// Ein Baustein, den es nicht mehr gibt, muss im Waehler STEHEN: sonst zeigte die
// Zeile eine rohe Baustein-Kennung.
function bausteinEintraege(
  liste: readonly { blockId: string; label: string }[],
  blockId: string | undefined,
): ListeEintrag[] {
  const eintraege: ListeEintrag[] = liste.map((e) => ({ wert: e.blockId, name: e.label }))
  if (blockId !== undefined && blockId !== '' && !liste.some((e) => e.blockId === blockId)) {
    eintraege.push({ wert: blockId, name: '(gelöschter Baustein)' })
  }
  return eintraege
}

function Merksatz({ text }: { text: string }) {
  return (
    <div className="flex h-steuer min-w-0 items-center rounded border border-linie bg-control px-2 text-ui text-matt">
      {text}
    </div>
  )
}

export function LeerBindung() {
  return <Merksatz text="leer" />
}

export function VorigesErgebnisBindung() {
  return <Merksatz text="Ergebnis des vorherigen Schritts" />
}

export function TextBindung({ binding, platzhalter, onChange }: BindungsProps) {
  return (
    <Feld
      value={binding.value}
      placeholder={platzhalter ?? (binding.source === 'se_variable' ? 'Variablenname' : 'Wert')}
      onChange={(e) => onChange({ ...binding, value: e.currentTarget.value })}
    />
  )
}

export function PlatzhalterBindung({ binding, onChange }: BindungsProps) {
  return (
    <PickerControl
      bezeichnung="Ereigniswert"
      gruppen={[{ key: 'platzhalter', eintraege: PLATZHALTER_EINTRAEGE }]}
      wert={binding.value}
      onWaehle={(wert) => onChange({ ...binding, value: wert })}
    />
  )
}

export function DatenfeldBindung({ binding, wahlen, onChange }: BindungsProps) {
  const quelle = wahlen.dataSources.find((s) => s.id === binding.dataSourceId)
  return (
    <Paar>
      <PickerControl
        bezeichnung="Datenquelle"
        gruppen={[{
          key: 'quellen',
          eintraege: wahlen.dataSources.map((s) => ({
            wert: s.id,
            name: s.name,
            kennung: quellenKennung(s),
          })),
        }]}
        wert={binding.dataSourceId ?? ''}
        platzhalter="— Quelle —"
        onWaehle={(id) => onChange({ ...binding, dataSourceId: id, value: '' })}
      />
      <PickerControl
        bezeichnung="Feld der Datenquelle"
        gruppen={[feldGruppe(quelle?.fields ?? [], quelle)]}
        wert={binding.value}
        platzhalter="— Feld —"
        onWaehle={(code) => onChange({ ...binding, value: code })}
      />
    </Paar>
  )
}

export function GewaehlteZeileBindung({ binding, wahlen, onChange }: BindungsProps) {
  const gewaehlter = wahlen.geber.find((g) => g.blockId === binding.blockId)
  return (
    <Paar>
      <PickerControl
        bezeichnung="Auswahl-Geber"
        gruppen={[{ key: 'geber', eintraege: bausteinEintraege(wahlen.geber, binding.blockId) }]}
        wert={binding.blockId ?? ''}
        platzhalter="— Baustein —"
        onWaehle={(id) => onChange({ ...binding, blockId: id, value: '' })}
      />
      <PickerControl
        bezeichnung="Feld der gewählten Zeile"
        gruppen={[feldGruppe(gewaehlter?.felder ?? [])]}
        wert={binding.value}
        platzhalter="— Feld —"
        onWaehle={(code) => onChange({ ...binding, value: code })}
      />
    </Paar>
  )
}

export function ZellenBindung({ binding, wahlen, onChange }: BindungsProps) {
  const erfasst = binding.source === 'erfassungszelle'
  const liste = erfasst
    ? wahlen.erfassungen
    : binding.source === 'aenderungszelle' ? wahlen.aenderungen : wahlen.loeschungen
  const tabelle = liste.find((t) => t.blockId === binding.blockId)
  return (
    <Paar>
      <PickerControl
        bezeichnung="Erfassung"
        gruppen={[{ key: 'tabellen', eintraege: bausteinEintraege(liste, binding.blockId) }]}
        wert={binding.blockId ?? ''}
        platzhalter="— Erfassung —"
        onWaehle={(id) => onChange({ ...binding, blockId: id, value: '' })}
      />
      <PickerControl
        bezeichnung={erfasst ? 'Spalte der Erfassungszeile' : 'Spalte der Zeile'}
        gruppen={[{
          key: 'spalten',
          eintraege: (tabelle?.spalten ?? []).map((s) => ({
            wert: s.kennung,
            name: s.titel,
          })),
        }]}
        wert={binding.value}
        platzhalter="— Spalte —"
        onWaehle={(kennung) => onChange({ ...binding, value: kennung })}
      />
    </Paar>
  )
}

export function BausteinBindung({ binding, wahlen, onChange }: BindungsProps) {
  const aktuell = binding.blockId !== undefined && binding.blockId !== ''
    ? blockValueKey(binding.blockId, binding.value)
    : ''
  return (
    <PickerControl
      bezeichnung="Baustein"
      gruppen={[{
        key: 'bausteine',
        eintraege: wahlen.blockValues.map((o) => ({ wert: o.key, name: o.label })),
      }]}
      wert={aktuell}
      platzhalter="— Baustein —"
      onWaehle={(key) => {
        const gewaehlt = wahlen.blockValues.find((option) => option.key === key)
        onChange(gewaehlt
          ? { source: 'block_value', blockId: gewaehlt.blockId, value: gewaehlt.prop }
          : { source: 'block_value', blockId: '', value: '' })
      }}
    />
  )
}

export function SchrittErgebnisBindung({ binding, wahlen, onChange }: BindungsProps) {
  const ziel = wahlen.schritte.find((s) => s.id === binding.value)
  const quelle = wahlen.dataSources.find((q) => q.id === ziel?.quelleId)
  const felder = quelle?.fields ?? []
  const feld = binding.ergebnisFeld ?? ''

  const setzeFeld = (wert: string) => {
    const naechste: Parameter = { ...binding }
    if (wert === '') delete naechste.ergebnisFeld
    else naechste.ergebnisFeld = wert
    onChange(naechste)
  }

  return (
    <Paar>
      <PickerControl
        bezeichnung="Ergebnis von Schritt"
        gruppen={[{
          key: 'schritte',
          eintraege: wahlen.schritte.map((s) => ({
            wert: s.id,
            name: `Schritt ${s.nr} — ${s.name}`,
          })),
        }]}
        wert={binding.value}
        platzhalter={wahlen.schritte.length === 0 ? '(kein GET-Schritt davor)' : '— wählen —'}
        onWaehle={(id) => {
          const naechste: Parameter = { ...binding, value: id }
          delete naechste.ergebnisFeld
          onChange(naechste)
        }}
      />
      {felder.length > 0 ? (
        <PickerControl
          bezeichnung="Feld des Ergebnisses"
          gruppen={[feldGruppe(felder, quelle)]}
          wert={feld}
          leerText="Ganzes Ergebnis"
          onWaehle={setzeFeld}
        />
      ) : (
        <Feld
          aria-label="Feld des Ergebnisses"
          value={feld}
          placeholder="ganzes Ergebnis"
          onChange={(e) => setzeFeld(e.currentTarget.value)}
        />
      )}
    </Paar>
  )
}
