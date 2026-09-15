// Die Spaltenkoepfe IM Suchfenster: derselbe Feldwaehler wie am Kopf der
// Erfassungszeile, nur ueber dem Fenster statt ueber der Leinwand. Der Baustein
// zeichnet dafuer nichts — gemessen wird sein Kopf, darueber liegt diese Schicht.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/editor/werkbank/cn'
import { EBENE_UEBER_MASKENFENSTER } from '@/editor/werkbank/AuswahlFenster'
import { Plus } from '@/editor/zeichen/zeichen'
import type { DialogRahmen } from '../../bausteine/shared/DialogRahmen'
import type { TabelleBlock } from '../../bausteine/tabelle/TabelleBlock'
import {
  neueSpalte,
  SPALTEN_MAX,
  STANDARD_TITEL,
  type Spalte,
} from '../../bausteine/tabelle/spalten'
import { quellenKennung } from '../../kern/daten/datenquellen'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'
import { useEingabeSitzung } from '../inspector/controls/eingabeSitzung'
import {
  beiFensterWechsel,
  fensterImEditorVergessen,
  fensterRahmenImEditor,
  fensterStandVon,
  offenesFensterImEditor,
  type FensterStand,
  type OffenesFenster,
} from './fensterStand'
import { breiteAusZeichen } from './feldBreite'
import { FieldPicker, type PickerGruppe } from './FieldPicker'

// An jeder Kopfkante gehoeren ein paar Pixel dem Breiten-Griff der Maske; die
// Schicht laesst sie frei.
const GRIFF_RAND = 6

// Die Editor-Schaltflaeche sitzt neben der Suche, ausserhalb des Spaltenrasters.
const PLUS_BREITE = 26

interface Kopf {
  // Der Platz in der Spaltenliste des Fensters, aus dem Attribut und nicht aus
  // der DOM-Reihenfolge.
  platz: number

  left: number
  top: number
  width: number
  height: number
}

interface Messung {
  koepfe: readonly Kopf[]

  // Die Kopfzeile selbst; ihr rechtes Ende traegt den Plus-Knopf.
  zeile: { rechts: number; top: number; height: number } | null
}

const NICHTS: Messung = { koepfe: [], zeile: null }

function tabelleIn(rahmen: DialogRahmen): TabelleBlock | null {
  return rahmen.querySelector<TabelleBlock>('ff-tabelle')
}

function messe(rahmen: DialogRahmen): Messung {
  const zeile = tabelleIn(rahmen)?.shadowRoot?.querySelector('.kopf')
  if (zeile == null) return NICHTS
  const zr = zeile.getBoundingClientRect()
  return {
    koepfe: Array.from(zeile.querySelectorAll<HTMLElement>(':scope > [data-ff-eintrag]')).map(
      (el, i) => {
        const r = el.getBoundingClientRect()
        const roh = Number(el.getAttribute('data-ff-eintrag'))
        return {
          platz: Number.isInteger(roh) ? roh : i,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        }
      },
    ),
    zeile: { rechts: zr.right, top: zr.top, height: zr.height },
  }
}

interface Mass {
  breite: number
  hoehe: number
}

// Das Fenster ist EINMAL gezeichnet; was der Bauer aendert, muss ihm
// nachgetragen werden, sonst zeigt es den Stand von vorhin.
function trageNach(rahmen: DialogRahmen, stand: FensterStand, vorher: Mass | null): void {
  const tabelle = tabelleIn(rahmen)
  if (tabelle !== null) {
    const spalten = [...stand.spalten]
    if (JSON.stringify(tabelle.spalten) !== JSON.stringify(spalten)) tabelle.spalten = spalten
  }
  // Das Mass nur, wenn der BAUM sich geaendert hat: waehrend eines Zugs steht am
  // Rahmen schon die neue Kante und im Baum noch die alte, und ein Nachtrag
  // zoege sie zurueck.
  if (vorher === null || vorher.breite !== stand.breite) rahmen.breite = stand.breite
  if (vorher === null || vorher.hoehe !== stand.hoehe) rahmen.hoehe = stand.hoehe
}

export function FensterSpalten() {
  const offen = useSyncExternalStore(beiFensterWechsel, offenesFensterImEditor)
  if (offen === null) return null
  // Ein anderes Fenster ist eine andere Sache: frische Auswahl, frischer Picker.
  return <Koepfe key={`${offen.blockId}:${offen.platz}`} offen={offen} />
}

function Koepfe({ offen }: { offen: OffenesFenster }) {
  const ed = useEditor()
  const bibliothek = useDataSources().list
  const [mass, setMass] = useState<Messung>(NICHTS)
  const [gewaehlt, setGewaehlt] = useState<number | null>(null)
  const schichtRef = useRef<HTMLDivElement | null>(null)
  const tippSitzung = useEingabeSitzung(
    () => ed.beginTransaction(),
    () => ed.endTransaction(),
  )

  // Das Fenster haengt am document.body und schliesst sich ohne Ereignis (Taste,
  // Kreuz, ein zweites Fenster). Ist es weg, ist auch die Schicht darueber weg.
  useEffect(() => {
    const pruefe = (): void => {
      if (fensterRahmenImEditor() === null) fensterImEditorVergessen()
    }
    const mo = new MutationObserver(pruefe)
    mo.observe(document.body, { childList: true })
    pruefe()
    return () => mo.disconnect()
  }, [offen])

  // Gemessen und ueber Resize- und MutationObserver nachgefuehrt, nie im
  // Rendern: das Fenster ist ziehbar, die Spaltenliste aendert sich.
  useEffect(() => {
    const rahmen = fensterRahmenImEditor()
    const tabelle = rahmen === null ? null : tabelleIn(rahmen)
    if (rahmen === null || tabelle?.shadowRoot == null) return
    const nachmessen = (): void => setMass(messe(rahmen))
    const ro = new ResizeObserver(nachmessen)
    ro.observe(tabelle)
    const mo = new MutationObserver(nachmessen)
    mo.observe(tabelle.shadowRoot, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-ff-eintrag'],
    })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [offen])

  const stand = fensterStandVon(ed, offen.blockId, offen.fenster, offen.platz)

  const nachgetragen = useRef<Mass | null>(null)
  useEffect(() => {
    const rahmen = fensterRahmenImEditor()
    if (rahmen === null || stand === null) return
    trageNach(rahmen, stand, nachgetragen.current)
    nachgetragen.current = { breite: stand.breite, hoehe: stand.hoehe }
  })

  if (stand === null) return null

  const quelle = bibliothek.find((s) => s.id === stand.quelleId)
  const gruppen: PickerGruppe[] = quelle === undefined ? [] : [{
    quelleId: '',
    name: quelle.name,
    kennung: quellenKennung(quelle),
    fields: quelle.felder,
  }]

  const aendere = (platz: number, teil: Partial<Spalte>): void => {
    stand.setzeSpalten(stand.spalten.map((s, i) => (i === platz ? { ...s, ...teil } : s)))
  }

  // Anfuegen macht den Waehler der neuen Spalte gleich auf: eine Spalte ohne
  // Feld hat noch nichts zu zeigen.
  const anfuegen = (): void => {
    const platz = stand.spalten.length
    stand.setzeSpalten([...stand.spalten, neueSpalte(platz)])
    setGewaehlt(platz)
  }

  const kopfDesPickers = gewaehlt === null
    ? undefined
    : mass.koepfe.find((k) => k.platz === gewaehlt)
  const spalteDesPickers = gewaehlt === null ? undefined : stand.spalten[gewaehlt]
  const standardTitel = STANDARD_TITEL.replace('{n}', String((gewaehlt ?? 0) + 1))

  const plus = stand.spalten.length < SPALTEN_MAX ? mass.zeile : null

  return createPortal(
    <>
      <div
        ref={schichtRef}
        data-ff-editor-helper
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: EBENE_UEBER_MASKENFENSTER }}
      >
        {mass.koepfe.map((kopf) => {
          const links = kopf.left + GRIFF_RAND
          const rechts = kopf.left + kopf.width - GRIFF_RAND
          return (
            <div
              key={kopf.platz}
              className={cn(
                'pointer-events-auto absolute cursor-pointer',
                'hover:bg-[hsl(var(--wb-auswahl)/0.16)]',
                gewaehlt === kopf.platz && 'bg-[hsl(var(--wb-auswahl)/0.16)]',
              )}
              style={{
                left: links,
                top: kopf.top,
                width: Math.max(0, rechts - links),
                height: kopf.height,
              }}
              title="Feld und Titel dieser Spalte im Suchfenster"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setGewaehlt((v) => (v === kopf.platz ? null : kopf.platz))
              }}
            />
          )
        })}

        {plus !== null && (
          <button
            type="button"
            aria-label="Spalte anfügen"
            title="Spalte anfügen"
            className={cn(
              'pointer-events-auto absolute grid cursor-pointer place-items-center rounded border border-[hsl(var(--wb-auswahl)/0.3)] bg-panel shadow-sm',
              'text-[hsl(var(--wb-auswahl))] hover:bg-[hsl(var(--wb-auswahl)/0.16)]',
            )}
            style={{
              left: plus.rechts - PLUS_BREITE,
              top: plus.top - 29,
              width: PLUS_BREITE,
              height: 24,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              anfuegen()
            }}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {kopfDesPickers !== undefined && spalteDesPickers !== undefined && gewaehlt !== null && (
        <FieldPicker
          key={gewaehlt}
          ebene={EBENE_UEBER_MASKENFENSTER}
          spotLabel={spalteDesPickers.titel === '' ? standardTitel : spalteDesPickers.titel}
          gruppen={gruppen}
          titel={{
            wert: spalteDesPickers.titel,
            standard: standardTitel,
            onAendern: (neu) => {
              tippSitzung.beginnen()
              aendere(gewaehlt, { titel: neu })
            },
            sitzung: tippSitzung,
          }}
          current={spalteDesPickers.feld}
          anker={schichtRef}
          top={kopfDesPickers.top + kopfDesPickers.height + 4}
          left={kopfDesPickers.left}
          // Die Feldwahl setzt den Titel IMMER auf den Klarnamen des Feldes, wie
          // am Kopf der Erfassungszeile. Umbenennen geht danach jederzeit.
          onPick={(wert) => {
            const feld = quelle?.felder.find((f) => f.code === wert)
            const klarname = feld?.name ?? ''
            const breite = breiteAusZeichen(feld?.zeichen)
            aendere(gewaehlt, {
              feld: wert,
              titel: wert === '' ? standardTitel : (klarname !== '' ? klarname : wert),
              ...(breite === undefined ? {} : { breite }),
            })
          }}
          entfernenLabel="Spalte entfernen"
          onEntfernen={!stand.gestellt && stand.spalten.length <= 1 ? undefined : () => {
            stand.setzeSpalten(stand.spalten.filter((_, i) => i !== gewaehlt))
            setGewaehlt(null)
          }}
          onClose={() => setGewaehlt(null)}
        />
      )}
    </>,
    document.body,
  )
}
