// Das Fenster, in dem ein Feld (oder erst seine Quelle) gewaehlt wird.
import { useEffect, useState, type RefObject } from 'react'
import { AuswahlFenster } from '@/editor/werkbank/AuswahlFenster'
import { cn } from '@/editor/werkbank/cn'
import { Marke } from '@/editor/werkbank/Marke'
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Liste, type ListeGruppe } from '@/editor/werkbank/Liste'
import { MenueZeile } from '@/editor/werkbank/MenueZeile'
import { Schalter } from '@/editor/werkbank/Schalter'
import { Trenner } from '@/editor/werkbank/Trenner'
import { bindungMitQuelle } from '../../kern/maske/bausteinArt'
import type { Datenfeld } from '../../kern/daten/datenquellen'
import type { Eingabesitzung } from '../inspector/controls/eingabeSitzung'

export interface PickerGruppe {
  quelleId: string

  name: string

  kennung?: string

  hinweis?: string
  fields: readonly Datenfeld[]
}

export interface PickerTitel {
  wert: string

  // Worauf ein leer getippter Titel zurueckfaellt: eine namenlose Spalte haette
  // sonst einen leeren Kopf.
  standard: string
  onAendern: (titel: string) => void

  sitzung: Eingabesitzung
}

export interface PickerSchalter {
  key: string
  label: string

  // Kurzwort fuer die Schalterzeile; `standard` sagt, welcher Stand keine
  // Einstellung ist.
  kurz?: string
  standard?: boolean
  an: boolean
  onSchalte: (an: boolean) => void
}

export interface PickerFeld {
  key: string
  label: string
  hinweis?: string

  aktuell: string

  // Nur Hilfsquellen zur Wahl. Die Hauptquelle steht immer an erster Stelle und
  // traegt die leere Kennung.
  nurFremdeQuellen?: boolean
  onWaehle: (wert: string) => void
}

interface FieldPickerProps {
  spotLabel: string
  gruppen: readonly PickerGruppe[]

  titel?: PickerTitel

  schalter?: readonly PickerSchalter[]

  weitereFelder?: readonly PickerFeld[]

  // Erste Stufe ohne Hauptquelle: das Fenster zeigt QUELLEN statt Feldern, sonst
  // bestimmte ein Klick nebenbei still die Hauptquelle.
  quellenWahl?: {
    hinweis: string
    eintraege: readonly { wert: string; name: string; kennung?: string }[]
    onWaehle: (quelleId: string) => void

  // Ohne eine einzige Quelle fuehrt der Picker dorthin, wo sie angelegt wird.
    onDatencenter?: () => void
  }

  current?: string

  // Diesen Eintrag streichen, als Fusszeile: ein Kreuz am Spaltenkopf lag bei
  // schmalen Spalten ueber dem Titel.
  onEntfernen?: () => void
  entfernenLabel?: string

  // Weiterfuehrende Einstellungen dieses Eintrags, die ein eigenes Fenster
  // brauchen. Stehen in der Fusszeile, damit sie immer zu sehen sind.
  weiter?: readonly {
    label: string
    hinweis?: string
    onOeffne: () => void
  }[]

  // Ein Zeigerdruck auf den Griff schliesst nicht: sonst raeumt der Druck das
  // Fenster ab und der Klick danach oeffnet es wieder.
  anker?: RefObject<HTMLElement | null>

  // Gesetzt, wo der Picker ueber einem Fenster der Maske liegt.
  ebene?: number

  top: number
  left: number

  onPick: (wert: string) => void
  onClose: () => void
}

const HAUPTFELD = ''

const NICHT_GEBUNDEN = 'Nicht gebunden'

interface Anzeige {
  name: string
  kennung?: string
  leer: boolean
  unbekannt: boolean
}

// Ein Wert, den keine Gruppe kennt, faellt rot auf, statt lautlos als „nicht
// gebunden" zu erscheinen.
function anzeigeVon(wert: string, gruppen: readonly PickerGruppe[]): Anzeige {
  if (wert === '') return { name: NICHT_GEBUNDEN, leer: true, unbekannt: false }
  for (const g of gruppen) {
    for (const f of g.fields) {
      if (bindungMitQuelle(g.quelleId, f.code) !== wert) continue
      return { name: f.label, kennung: f.code, leer: false, unbekannt: false }
    }
  }
  return { name: wert, leer: false, unbekannt: true }
}

function listeGruppen(gruppen: readonly PickerGruppe[]): ListeGruppe[] {
  return gruppen.map((g) => ({
    key: g.quelleId === '' ? '__erste__' : g.quelleId,
    name: g.name,
    kennung: g.kennung,
    hinweis: g.hinweis === undefined || g.hinweis === '' ? undefined : `über ${g.hinweis}`,
    eintraege: g.fields.map((f) => ({
      wert: bindungMitQuelle(g.quelleId, f.code),
      name: f.label,
      kennung: f.code,
    })),
  }))
}

interface FeldZeileProps {
  label: string
  hinweis?: string
  anzeige: Anzeige
  aktiv: boolean
  onAktiv: () => void
}

// Jede Feld-Wahl zieht die EINE Liste unten auf sich, kein zweites Fenster im
// Fenster: ein Popover im Popover schliesst beide.
function FeldZeile({ label, hinweis, anzeige, aktiv, onAktiv }: FeldZeileProps) {
  return (
    <MenueZeile
      aktiv={aktiv}
      aria-pressed={aktiv}
      title={hinweis}
      onClick={onAktiv}
      className="px-1.5"
    >
      {/* Feste Breite, damit die Beschriftungen der Zeilen an derselben Kante
          stehen. 6rem, weil das laengste Wort sonst abgeschnitten wird:
          „Nachschlagen" braucht 74 px bei 13,5 px Grundgroesse, 5rem gaben 68. */}
      <span className="w-24 shrink-0 truncate text-ui text-matt">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-ui',
          anzeige.leer && 'text-matt',
          anzeige.unbekannt ? 'text-fehler' : 'text-tinte',
        )}
      >
        {anzeige.name}
      </span>
      {anzeige.kennung !== undefined && anzeige.kennung !== '' && (
        <Marke className="max-w-[45%]">{anzeige.kennung}</Marke>
      )}
    </MenueZeile>
  )
}

export function FieldPicker({
  spotLabel,
  gruppen,
  titel,
  schalter,
  weitereFelder,
  quellenWahl,
  current,
  anker,
  ebene,
  top,
  left,
  onPick,
  onClose,
  onEntfernen,
  entfernenLabel,
  weiter,
}: FieldPickerProps) {
  // Schliesst das Fenster ohne blur, bliebe die offene Tipp-Klammer stehen — und
  // Undo waere fuer den Rest der Sitzung stumm.
  const titelSitzung = titel?.sitzung
  useEffect(() => () => {
    titelSitzung?.beenden()
  }, [titelSitzung])

  const [zielKey, setZielKey] = useState(HAUPTFELD)

  const weitereZiele = weitereFelder ?? []

  const ziele: readonly PickerFeld[] = [
    {
      key: HAUPTFELD,
      label: 'Feld',
      aktuell: current ?? '',
      onWaehle: onPick,
    },
    ...weitereZiele,
  ]
  const aktiv = ziele.find((z) => z.key === zielKey) ?? ziele[0]

  // ALLE Hilfsquellen auf einmal, nach Quelle gruppiert: nach der Wahl einer
  // Quelle saehe der Bediener die anderen nicht mehr und hielte sie fuer nicht
  // angeboten. Die Stufe bleibt nur, solange es keine Hauptquelle gibt.
  const sichtbareGruppen = aktiv.nurFremdeQuellen === true
    ? gruppen.filter((g) => g.quelleId !== '')
    : gruppen

  const hatTut = (schalter?.length ?? 0) > 0

  const feldZeile = (ziel: PickerFeld) => (
    <FeldZeile
      key={ziel.key}
      label={ziel.label}
      hinweis={ziel.hinweis}
      anzeige={anzeigeVon(ziel.aktuell, gruppen)}
      aktiv={ziel.key === aktiv.key}
      onAktiv={() => setZielKey(ziel.key)}
    />
  )

  return (
    <AuswahlFenster
      bezeichnung={`Feld für ${spotLabel}`}
      oben={top}
      links={left}
      anker={anker}
      ebene={ebene}
      onClose={onClose}
      imBildHalten
      escapeAbfangen
      className="max-h-[30rem] w-[380px] border-linie bg-panel p-1.5 text-tinte shadow-overlay"
    >
      <div className="flex flex-col gap-1.5">
        <p className="truncate px-1.5 pt-0.5 text-dicht font-semibold uppercase tracking-wide text-matt">
          {spotLabel}
        </p>

        {quellenWahl ? (
          quellenWahl.eintraege.length === 0 ? (
            <div className="flex flex-col gap-2 px-1.5 pb-1">
              <p className="text-ui text-matt">
                Noch keine Datenquelle. Lege im Datencenter an, woher die Daten kommen.
              </p>
              {quellenWahl.onDatencenter && (
                <Knopf art="primaer" className="self-start" onClick={quellenWahl.onDatencenter}>
                  Datencenter öffnen
                </Knopf>
              )}
            </div>
          ) : (
            <>
              <p className="px-1.5 text-ui text-matt">{quellenWahl.hinweis}</p>
              <Trenner />
              <Liste
                suchbar={quellenWahl.eintraege.length > 8}
                gruppen={[{ key: 'quellen', eintraege: quellenWahl.eintraege }]}
                wert=""
                onWaehle={quellenWahl.onWaehle}
              />
            </>
          )
        ) : (
          <>
        {/* Der Titel ist der NAME des Dings, keine Einstellung unter anderen —
            darum steht er oben und nicht als Zeile mittendrin. */}
        {titel && (
          <Feld
            value={titel.wert}
            placeholder={titel.standard}
            aria-label="Spaltenname"
            onChange={(e) => {
              titel.sitzung.beginnen()
              titel.onAendern(e.currentTarget.value)
            }}
            onBlur={() => {
              titel.sitzung.beenden()
              if (titel.wert.trim() === '') titel.onAendern(titel.standard)
            }}
            className="font-medium"
          />
        )}

        {feldZeile(ziele[0])}

        {/* Das Fuellfeld steht OFFEN und gleichrangig neben dem Hauptfeld: es
            ist der halbe Sinn der Spalte, nicht eine seltene Zusatzeinstellung.
            Zugeklappt bleibt nur, was man selten anfasst. Ohne Hilfsquelle
            waere es sinnlos — dann erscheint es nicht. */}
        {weitereZiele.map(feldZeile)}

        {/* Die Schalter stehen OFFEN, nebeneinander in einer Zeile. Zugeklappt
            merkte niemand, dass es sie gibt — und „In der Zeile aenderbar"
            steht auf JA, ohne dass es je jemand eingestellt hat. Eine Zeile
            kostet weniger als eine Klappe und verbirgt nichts. */}
        {hatTut && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1.5">
            {(schalter ?? []).map((s) => (
              <Schalter
                key={s.key}
                an={s.an}
                beschriftung={s.kurz ?? s.label}
                hinweis={s.label}
                onSchalte={s.onSchalte}
              />
            ))}
          </div>
        )}

        <Trenner />

        <p className="flex items-baseline gap-2 px-1.5 text-dicht font-semibold uppercase tracking-wide text-matt">
          <span className="min-w-0 truncate">
            {aktiv.label} wählen
          </span>
          {sichtbareGruppen.length === 1 && (
            <span className="min-w-0 truncate normal-case tracking-normal">
              aus {sichtbareGruppen[0].name}
            </span>
          )}
        </p>

        {/* Eigener Schluessel-Raum: das Hauptfeld hat den Schluessel '' — als
            Geschwister der FeldZeile mit demselben Schluessel meldete React
            doppelte Schluessel, und die Liste konnte beim Umschalten
            verschwinden. */}
        <Liste
          key={`liste:${aktiv.key}`}
          suchbar
          gruppen={listeGruppen(
            sichtbareGruppen.length === 1
              ? [{ ...sichtbareGruppen[0], name: '' }]
              : sichtbareGruppen,
          )}
          wert={aktiv.aktuell}
          leerText={NICHT_GEBUNDEN}
          leerHinweis={
            aktiv.nurFremdeQuellen === true
              ? 'Keine Hilfsquelle am Baustein.'
              : undefined
          }
          onWaehle={aktiv.onWaehle}
        />
          </>
        )}
        {((weiter?.length ?? 0) > 0 || onEntfernen !== undefined) && (
      // Klebt am unteren Rand: beide Tasten sind immer zu sehen, egal wie lang die
      // Feldliste ist.
          <div className="sticky bottom-0 -mb-1 flex items-center justify-between gap-2 border-t border-linie bg-panel px-1.5 py-1.5">
            <div className="flex items-center gap-1.5">
              {(weiter ?? []).map((w) => (
                <Knopf key={w.label} title={w.hinweis} onClick={w.onOeffne}>{w.label}</Knopf>
              ))}
            </div>
            {onEntfernen !== undefined && (
              <Knopf art="gefahr" onClick={onEntfernen}>{entfernenLabel ?? 'Entfernen'}</Knopf>
            )}
          </div>
        )}
      </div>
    </AuswahlFenster>
  )
}
