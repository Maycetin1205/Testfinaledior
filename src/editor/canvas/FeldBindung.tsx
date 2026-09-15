// Der Feld-Waehler des Editors: eine Stelle oder einen Listeneintrag an ein Feld binden.
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Baustein } from '../../kern/maske/baum'
import {
  feldWahlenLesen,
  schalterAn,
  schalterFuer,
  listenStandardTitel,
  listeLesen,
  type ListenBindung,
} from '../../kern/maske/bausteinArt'
import { bindungsProp, type BindbareStelle, type SuchFenster } from '../../kern/maske/faehigkeiten'
import { zerlegeBindung } from '../../kern/maske/bausteinArt'
import { kannRechnen } from '../../kern/maske/baumFragen'
import { quellenKennung } from '../../kern/daten/datenquellen'
import { paarKlartext, type QuelleInReichweite } from '../../kern/daten/weitereQuellen'
import type { Editor } from '../zustand/Editor'
import { wendeProps } from '../zustand/propsPatch'
import { quellenTraeger } from '../../kern/maske/quellenReichweite'
import { useDataSources } from '../zustand/useDataSources'
import { breiteAusZeichen, zeichenVon } from './feldBreite'
import { oeffneBerechnungenFenster } from './berechnungenStand'
import { oeffneFensterImEditor } from './fensterStand'
import { useEingabeSitzung } from '../inspector/controls/eingabeSitzung'
import { oeffneDatencenter } from '../zentrale/oeffnen'
import { FieldPicker, type PickerGruppe } from './FieldPicker'
import { bindingCode, useBindingPicker } from './useBindingPicker'

interface FeldBindungArgs {
  editor: Editor
  blockRef: RefObject<Baustein>
  block: Baustein
  selected: boolean | undefined
  bindableSpots: readonly BindbareStelle[]
  listenBindung: ListenBindung | undefined

  suchFenster: SuchFenster | undefined

  quellen: readonly QuelleInReichweite[]

  containerRef: RefObject<HTMLDivElement | null>

  // Das Lit-Element selbst, kein Ref: das Suchfenster braucht es als Anker.
  element: HTMLElement | null

  onSelect?: () => void
}

function pickerGruppen(quellen: readonly QuelleInReichweite[]): PickerGruppe[] {
  const erste = quellen[0]?.source
  return quellen.map((q, i) => (i === 0
    ? {
        quelleId: '',
        name: q.source.name,
        kennung: quellenKennung(q.source),
        fields: q.source.fields,
      }
    : {
        quelleId: q.source.id,
        name: q.source.name,
        kennung: quellenKennung(q.source),
    // Die linke Seite eines Paares gehoert der PARTNER-Quelle; sonst schlaegt der
    // Klartext im falschen Feldbestand nach und bleibt leer.
        hinweis: paarKlartext(
          q.paare ?? [],
          q.partnerId ? quellen.find((x) => x.source.id === q.partnerId)?.source : erste,
        ),
        fields: q.source.fields,
      }))
}

function klarnameVon(wert: string, quellen: readonly QuelleInReichweite[]): string {
  const { quelleId, code } = zerlegeBindung(wert)
  const quelle = quelleId === ''
    ? quellen[0]?.source
    : quellen.find((q) => q.source.id === quelleId)?.source
  return quelle?.fields.find((f) => f.code === code)?.label ?? ''
}

export function useFeldBindung({
  editor,
  blockRef,
  block,
  selected,
  bindableSpots,
  listenBindung,
  suchFenster,
  quellen,
  containerRef,
  element,
  onSelect,
}: FeldBindungArgs): {
  onClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  onDoubleClick: (e: ReactMouseEvent<HTMLDivElement>) => void
  pickers: ReactNode
} {
  const bibliothek = useDataSources().list

  const tippSitzung = useEingabeSitzung(
    () => editor.beginTransaction(),
    () => editor.endTransaction(),
  )
  const hatQuelle = quellen.length > 0

  // Auch ohne eine einzige Datenquelle geht der Picker auf: er sagt dann, dass
  // eine fehlt, und fuehrt ins Datencenter.
  const bibliotheksAngebot = !hatQuelle && quellenTraeger(editor.tree, block.id) !== undefined
  const hatAngebot = hatQuelle || bibliotheksAngebot

  const { picker, closePicker, onClick, onDoubleClick } = useBindingPicker({
    editor,
    blockRef,
    selected,
    bindableSpots,
    hatAngebot,
    onSelect,
  })

  const [listenPicker, setListenPicker] = useState<{
    index: number
    top: number
    left: number

    liste?: unknown
  } | null>(null)
  const closeListenPicker = useCallback(() => setListenPicker(null), [])
  if (!selected && listenPicker !== null) setListenPicker(null)

  // listenBindung.quelleProp: die Felder kommen NUR aus der Quelle, deren id in
  // dieser Block-Eigenschaft steht, nie aus den Quellen in Reichweite.
  const quelleAusProp = listenBindung?.quelleProp === undefined
    ? undefined
    : bibliothek.find((s) => s.id === String(block.props[listenBindung.quelleProp ?? ''] ?? ''))
  const listenPickerHatFelder = listenBindung?.quelleProp !== undefined
    ? quelleAusProp !== undefined
    : hatAngebot

  useEffect(() => {
    const el = containerRef.current
    if (!el || !listenBindung) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        prop?: string
        index?: number
        top?: number
        left?: number
        liste?: unknown
      }

      if (detail?.prop !== listenBindung.prop || typeof detail.index !== 'number') return
      const index = detail.index
    // Ein zweiter Klick auf DENSELBEN Kopf macht wieder zu; ein anderer Kopf
    // schaltet um statt zu schliessen.
      setListenPicker((vorher) => (vorher !== null && vorher.index === index ? null : {
        index,
        top: Math.max(8, detail.top ?? 0),
        left: Math.max(8, Math.min(detail.left ?? 0, window.innerWidth - 248)),
        ...(Array.isArray(detail.liste) ? { liste: detail.liste } : {}),
      }))
    }
    el.addEventListener('ff-listen-bind', handler)
    return () => el.removeEventListener('ff-listen-bind', handler)
  }, [containerRef, listenBindung])

  // Eingestellt wird das Suchfenster IM Fenster; der Knopf am Spaltenkopf macht
  // es auf, so wie die Lupe in der Zelle.
  const eigenesFenster = suchFenster?.eintraegeProp !== undefined
    && suchFenster.eintraegeProp === listenBindung?.prop

  const oeffneFenster = (platz: number): void => {
    if (!element || suchFenster === undefined) return
    oeffneFensterImEditor(editor, element, block.id, suchFenster, platz)
  }

  const gruppen = pickerGruppen(quellen)

  // Erste Stufe, solange der Baustein keine Hauptquelle hat: die Quellen der
  // Bibliothek. Staenden hier alle Felder aller Quellen, bestimmte die Wahl eines
  // Feldes nebenbei still die Hauptquelle.
  const quellenWahl = !bibliotheksAngebot ? undefined : {
    hinweis: 'Erst die Hauptquelle wählen.',
    eintraege: bibliothek.map((s) => ({ wert: s.id, name: s.name, kennung: quellenKennung(s) })),
    onDatencenter: oeffneDatencenter,
    onWaehle: (quelleId: string) => {
      const traeger = quellenTraeger(editor.tree, blockRef.current.id)
      if (quelleId === '' || !traeger) return
      editor.updateProperty(traeger.id, 'source', quelleId)
    },
  }

  // Solange die Eigenschaft leer ist (Automatik), gilt die vom Baustein
  // mitgeschickte Anzeige-Liste.
  type PickerStand = { index: number; liste?: unknown }

  const eintraegeVon = (picker: PickerStand): Record<string, unknown>[] => {
    if (!listenBindung) return []
    const ausProps = listeLesen(block.props[listenBindung.prop], listenBindung)
    return ausProps.length > 0 ? ausProps : listeLesen(picker.liste, listenBindung)
  }

  // Nimmt ein GANZES Paket von Schluesseln: `block.props` ist der Stand des
  // letzten Rendervorgangs, zwei Aufrufe hintereinander lesen beide denselben
  // alten Stand. `undefined` LOESCHT den Schluessel, damit ein leer gewaehltes
  // Feld nicht als '' in jede Maskendatei mitreist.
  const schreibeInEintrag = (picker: PickerStand, teil: Record<string, unknown>): void => {
    if (!listenBindung) return
    const next = eintraegeVon(picker)
    const ziel = next[picker.index]
    if (!ziel) return
    for (const [key, wert] of Object.entries(teil)) {
      if (wert === undefined) delete ziel[key]
      else ziel[key] = wert
    }
    editor.updateProperty(block.id, listenBindung.prop, next)
  }

  const pickers = (
    <>
      {selected && picker && hatAngebot && (
        <FieldPicker
          spotLabel={picker.spot.label}
          gruppen={gruppen}
          current={bindingCode(block.props, picker.spot)}
          top={picker.top}
          left={picker.left}
          quellenWahl={quellenWahl}
          onPick={(wert) => {
            editor.updateProperty(blockRef.current.id, bindungsProp(picker.spot.prop), wert)
            closePicker()
          }}
          onClose={closePicker}
        />
      )}
      {selected && listenPicker && listenBindung && listenPickerHatFelder && (() => {
        const listeJetzt = (): Record<string, unknown>[] => eintraegeVon(listenPicker)
        const liste = listeJetzt()
        const eintrag = liste[listenPicker.index]
        if (!eintrag) return null

    // quelleProp-Modus: eine Gruppe, nackte Feldcodes.
        const proQuelle = quelleAusProp !== undefined
        const listenGruppen: PickerGruppe[] = proQuelle
          ? [{
              quelleId: '',
              name: quelleAusProp.name,
              kennung: quellenKennung(quelleAusProp),
              fields: quelleAusProp.fields,
            }]
          : gruppen
        const titelJetzt = String(eintrag[listenBindung.titelKey] ?? '')
        const standardTitel = listenStandardTitel(listenBindung, listenPicker.index)
        return (
          <FieldPicker
          // Ein anderer Spaltenkopf = frisches Fenster. Ohne `key` behielte es sein
          // Schreibziel und band bei der naechsten Spalte wieder das Fuellfeld.
            key={listenPicker.index}
            spotLabel={titelJetzt === '' ? standardTitel : titelJetzt}
            gruppen={listenGruppen}
            titel={{
              wert: titelJetzt,
              standard: standardTitel,
              onAendern: (neu) => {
                tippSitzung.beginnen()
                schreibeInEintrag(listenPicker, { [listenBindung.titelKey]: neu })
              },
              sitzung: tippSitzung,
            }}
            weitereFelder={feldWahlenLesen(listenBindung, eintrag).map(({ wahl: fw, wert }) => ({
              key: fw.key,
              label: fw.label,
              hinweis: fw.hinweis,
              aktuell: wert,
              nurFremdeQuellen: fw.nurFremdeQuellen,
              onWaehle: (neu) => schreibeInEintrag(
                listenPicker,
                { [fw.key]: neu === '' ? undefined : neu },
              ),
            }))}
            schalter={schalterFuer(listenBindung, eintrag).map((s) => ({
              key: s.key,
              label: s.label,
              kurz: s.kurz,
              standard: s.standard,
              an: schalterAn(s, eintrag),
              onSchalte: (an) => schreibeInEintrag(listenPicker, { [s.key]: an }),
            }))}
            current={String(eintrag[listenBindung.feldKey] ?? '')}
            weiter={[
              ...(!eigenesFenster || suchFenster === undefined ? [] : [{
                label: 'Suchfenster…',
                onOeffne: () => {
                  oeffneFenster(listenPicker.index)
                  // Der Spaltenkopf-Picker macht zu: sonst laege eine zweite
                  // Einstellflaeche fuer dieselbe Spalte darueber.
                  setListenPicker(null)
                },
              }]),
              ...(!kannRechnen(block) ? [] : [{
                label: 'Berechnung…',
                hinweis: 'Eine Gleichung über mehrere Spalten: drei Werte ergeben den vierten.',
                onOeffne: () => {
                  oeffneBerechnungenFenster(block.id)
                  setListenPicker(null)
                },
              }]),
            ]}
            entfernenLabel={`${listenBindung.standardTitel.replace(/\s*\{n\}/, '')} entfernen`}
            onEntfernen={listenBindung.eintragWeg === undefined ? undefined : () => {
              const weg = listenBindung.eintragWeg
              if (!weg) return
              if (!wendeProps(editor, block.id, weg(block.props, listenPicker.index))) return
              setListenPicker(null)
            }}
            quellenWahl={proQuelle ? undefined : quellenWahl}
            anker={containerRef}
            top={listenPicker.top}
            left={listenPicker.left}
            onPick={(roh) => {
              editor.transaktion(() => {
                const wert = roh
                const next = listeJetzt()
                const ziel = next[listenPicker.index]
                if (!ziel) return

  // Die Feldwahl setzt den Titel IMMER auf den Klarnamen des Feldes. Umbenennen
  // geht danach jederzeit, bis zur naechsten Feldwahl. Kehrseite: wer eine Spalte
  // benannt hat und danach umbindet, muss den Namen neu tippen.
                const klarname = (feldWert: string): string => (proQuelle
                  ? (quelleAusProp.fields.find((f) => f.code === feldWert)?.label ?? '')
                  : klarnameVon(feldWert, quellen)) || feldWert

                // Die Breite kommt vom Feld MIT, wenn es eine nennt. Nennt es
                // keine, bleibt die Spalte, wie der Bauer sie gezogen hat: ein
                // Feld ohne Angabe hat zur Breite keine Meinung.
                const zeichen = proQuelle
                  ? quelleAusProp.fields.find((f) => f.code === wert)?.zeichen
                  : zeichenVon(wert, quellen)
                const breite = breiteAusZeichen(zeichen)

                ziel[listenBindung.titelKey] = wert === '' ? standardTitel : klarname(wert)
                ziel[listenBindung.feldKey] = wert
                if (breite !== undefined) ziel.breite = breite
                editor.updateProperty(block.id, listenBindung.prop, next)
              })
          // Das Fenster bleibt OFFEN: es ist die Einstellflaeche der Spalte, kein
          // einmaliger Feldwaehler.
            }}
            onClose={closeListenPicker}
          />
        )
      })()}
    </>
  )

  return { onClick, onDoubleClick, pickers }
}
