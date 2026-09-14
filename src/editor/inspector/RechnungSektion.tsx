// Die Formeln der Erfassung einstellen: welche Spalte sich woraus rechnet.
import { Gruppe } from '@/ui/werkbank/Gruppe'
import { Knopf } from '@/ui/werkbank/Knopf'
import { Segment, type SegmentOption } from '@/ui/werkbank/Segment'
import { Wahl, type WahlOption } from '@/ui/werkbank/Wahl'
import { Zahl } from '@/ui/werkbank/Zahl'
import { X } from '@/ui/zeichen'
import { coerceSpalten, fehlendeGlieder, type Spalte } from '../../blocks/tabelle/spalten'
import type { BlockNode } from '../../core/blocks/BlockData'
import {
  formelAlsText,
  neueFormel,
  zahlStreng,
  zahlText,
  STELLEN_MAX,
  type Formel,
  type Glied,
  type Rechenzeichen,
  type RundungsRichtung,
} from '../../core/data/rechnung'
import { useEditor } from '../../state/useEditor'
import { useAbschnitt } from './abschnittStand'

// Sie gehoert zur Erfassung, deren Zeile sie rechnet, und wird darum hier
// bedient und nicht im Datencenter: sie ist nichts Maskenweites.

const RICHTUNGEN: WahlOption[] = [
  { wert: 'auf', name: 'aufrunden' },
  { wert: 'ab', name: 'abrunden' },
  { wert: 'kfm', name: 'kaufmännisch' },
]

const ZEICHEN: SegmentOption[] = [
  { wert: '+', name: 'plus', zeichen: '+' },
  { wert: '-', name: 'minus', zeichen: '−' },
  { wert: '*', name: 'mal', zeichen: '×' },
  { wert: '/', name: 'geteilt', zeichen: '÷' },
]

// Der Eintrag der Spaltenwahl, der eine feste Zahl statt einer Spalte meint.
const FESTE_ZAHL = '#zahl'

function spaltenName(spalte: Spalte): string {
  return (spalte.titel === '' ? spalte.kennung : spalte.titel)
    + (spalte.versteckt === true ? ' (ausgeblendet)' : '')
}

function mitFormel(spalte: Spalte, formel: Formel | undefined): Spalte {
  const ohne: Spalte = { ...spalte }
  delete ohne.formel
  return formel === undefined ? ohne : { ...ohne, formel }
}

function FesteZahl({ wert, onWert }: { wert: number; onWert: (zahl: number) => void }) {
  const text = zahlText(wert, STELLEN_MAX)
  return (
    <Zahl
      key={text}
      className="w-20"
      title="Feste Zahl, deutsch geschrieben"
      defaultValue={text}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      onBlur={(e) => {
        const zahl = zahlStreng(e.currentTarget.value)
        if (zahl === null) e.currentTarget.value = text
        else if (zahl !== wert) onWert(zahl)
      }}
    />
  )
}

function FormelZeilen({ spalten, index, onFormel }: {
  spalten: readonly Spalte[]
  index: number
  onFormel: (formel: Formel | undefined) => void
}) {
  const spalte = spalten[index]
  const formel = spalte.formel
  if (formel === undefined) return null
  const andere: WahlOption[] = spalten
    .filter((s, i) => i !== index && s.kennung !== '')
    .map((s) => ({ wert: s.kennung, name: spaltenName(s) }))
  const optionen: WahlOption[] = [...andere, { wert: FESTE_ZAHL, name: 'Zahl…' }]
  const titelVon = (kennung: string): string => {
    const s = spalten.find((sp) => sp.kennung === kennung)
    // Eine gestrichene Spalte behaelt ihre Kennung im Text: sonst stuende dort
    // ein Fragezeichen und niemand wuesste, was fehlt.
    return s === undefined ? kennung : (s.titel === '' ? s.kennung : s.titel)
  }

  const setzeGlied = (i: number, glied: Glied): void => {
    onFormel({ ...formel, glieder: formel.glieder.map((g, k) => (k === i ? glied : g)) })
  }
  const setzeZeichen = (i: number, zeichen: Rechenzeichen): void => {
    onFormel({ ...formel, zeichen: formel.zeichen.map((z, k) => (k === i ? zeichen : z)) })
  }
  const gliedWeg = (i: number): void => {
    if (formel.glieder.length <= 1) return
    onFormel({
      ...formel,
      glieder: formel.glieder.filter((_, k) => k !== i),
      zeichen: formel.zeichen.filter((_, k) => k !== Math.max(0, i - 1)),
    })
  }
  const gliedDazu = (): void => {
    onFormel({
      ...formel,
      glieder: [...formel.glieder, { spalte: '' }],
      zeichen: [...formel.zeichen, '*'],
    })
  }

  const fehlen = fehlendeGlieder(formel, spalten)

  return (
    <div className="flex flex-col gap-1.5 rounded border border-linie p-2">
      {fehlen.length > 0 && (
        <p className="text-dicht text-fehler">
          Die Formel ist unvollständig: {fehlen.length === 1 ? 'die Spalte' : 'die Spalten'}
          {' '}{fehlen.join(', ')} {fehlen.length === 1 ? 'gibt' : 'geben'} es nicht mehr.
          Sie rechnet erst wieder, wenn hier eine Spalte steht.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-ui" title={formelAlsText(formel, titelVon)}>
          <span className="font-medium">{spaltenName(spalte)}</span>
          {' = '}
          {formelAlsText(formel, titelVon)}
        </span>
        <Knopf nurZeichen aria-label="Formel entfernen" onClick={() => onFormel(undefined)}>
          <X className="size-3.5" />
        </Knopf>
      </div>

      {formel.glieder.map((glied, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i === 0
            ? <span className="w-steuer shrink-0 text-center text-ui text-matt">=</span>
            : (
              <Segment
                bezeichnung="Rechenzeichen"
                optionen={ZEICHEN}
                wert={formel.zeichen[i - 1] ?? '*'}
                onWaehle={(z) => setzeZeichen(i - 1, z as Rechenzeichen)}
              />
            )}
          <Wahl
            optionen={optionen}
            wert={'zahl' in glied ? FESTE_ZAHL : glied.spalte}
            leerText="Spalte wählen"
            onWaehle={(wert) => setzeGlied(i, wert === FESTE_ZAHL ? { zahl: 1 } : { spalte: wert })}
          />
          {'zahl' in glied && (
            <FesteZahl wert={glied.zahl} onWert={(zahl) => setzeGlied(i, { zahl })} />
          )}
          <Knopf
            nurZeichen
            aria-label="Glied entfernen"
            disabled={formel.glieder.length <= 1}
            onClick={() => gliedWeg(i)}
          >
            <X className="size-3.5" />
          </Knopf>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-1.5">
        <Knopf onClick={gliedDazu}>+ Glied</Knopf>
        <span className="ml-auto text-dicht text-matt">runden</span>
        <Zahl
          einheit="NK"
          title="Nachkommastellen des gerechneten Werts"
          className="w-16"
          min={0}
          max={STELLEN_MAX}
          value={formel.runden.stellen}
          onChange={(e) => {
            const stellen = Number.parseInt(e.target.value, 10)
            if (Number.isInteger(stellen) && stellen >= 0 && stellen <= STELLEN_MAX) {
              onFormel({ ...formel, runden: { ...formel.runden, stellen } })
            }
          }}
        />
        <Wahl
          className="w-auto"
          optionen={RICHTUNGEN}
          wert={formel.runden.richtung}
          onWaehle={(richtung) => onFormel({
            ...formel,
            runden: { ...formel.runden, richtung: richtung as RundungsRichtung },
          })}
        />
      </div>
    </div>
  )
}

export function RechnungSektion({ block }: { block: BlockNode }) {
  const [offen, schalte] = useAbschnitt('rechnung')
  const ed = useEditor()
  const spalten = coerceSpalten(block.props.spalten)

  const setzeFormel = (index: number, formel: Formel | undefined): void => {
    ed.updateProperty(
      block.id,
      'spalten',
      spalten.map((s, i) => (i === index ? mitFormel(s, formel) : s)),
    )
  }

  const mitFormeln = spalten.map((_, i) => i).filter((i) => spalten[i].formel !== undefined)
  const ohneFormel: WahlOption[] = spalten
    .map((s, i) => ({ spalte: s, index: i }))
    .filter(({ spalte }) => spalte.formel === undefined && spalte.kennung !== '')
    .map(({ spalte, index }) => ({ wert: String(index), name: spaltenName(spalte) }))

  return (
    <Gruppe titel="Rechnung" offen={offen} onSchalte={schalte}>
      <div className="flex flex-col gap-3">
        <p className="text-dicht text-matt">
          Eine Spalte mit Formel rechnet sich aus anderen Spalten, sobald alle
          Glieder gefüllt sind. Mal und Geteilt gehen vor Plus und Minus.
          Getipptes geht vor.
        </p>

        {mitFormeln.map((index) => (
          <FormelZeilen
            key={spalten[index].kennung}
            spalten={spalten}
            index={index}
            onFormel={(formel) => setzeFormel(index, formel)}
          />
        ))}

        {ohneFormel.length > 0 && (
          <Wahl
            optionen={ohneFormel}
            wert=""
            leerText="Formel für Spalte…"
            onWaehle={(wert) => setzeFormel(Number(wert), neueFormel())}
          />
        )}
      </div>
    </Gruppe>
  )
}
