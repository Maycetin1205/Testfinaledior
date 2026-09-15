// Der Datenquellen-Bereich des Datencenters: Liste, Anlegen, Kopieren, Loeschen.
import { useRef, useState, type ReactNode } from 'react'
import { FileUp, Plus, TriangleAlert } from '@/ui/zeichen'
import { Gruppe } from '@/ui/werkbank/Gruppe'
import { Knopf } from '@/ui/werkbank/Knopf'
import { ListeDetail } from '@/ui/werkbank/ListeDetail'
import { Eintrag } from '@/ui/werkbank/Eintrag'
import { Marke } from '@/ui/werkbank/Marke'
import {
  artFuer,
  quellenKennung,
  type Datenquelle,
} from '../../core/data/dataSources'
import { quellenWorte } from './beschriftungen'
import { dtkLesen, type DtkTabelle } from '../../core/data/dtkImport'
import { bausteineMitQuelle } from '../../state/quellenOps'
import { useDataSources } from '../../state/useDataSources'
import { useEditor } from '../../state/useEditor'
import { DataSourceForm } from './DataSourceForm'
import { DtkImportForm } from './DtkImportForm'
import { bausteinName } from '../../core/blocks/bausteinName'
import { ikonFuer } from './helfer'

// „Belege (Kopie)", und wenn es die schon gibt: „Belege (Kopie 2)" — zwei
// gleichnamige Quellen waeren im Feld-Picker nicht zu unterscheiden.
function kopieName(name: string, vergeben: readonly string[]): string {
  const basis = `${name} (Kopie)`
  if (!vergeben.includes(basis)) return basis
  let n = 2
  while (vergeben.includes(`${name} (Kopie ${n})`)) n += 1
  return `${name} (Kopie ${n})`
}

export function DatenquellenBereich({ bereiche }: { bereiche?: ReactNode }) {
  const store = useDataSources()
  const ed = useEditor()
  const [auswahlId, setAuswahlId] = useState<string | null>(store.list[0]?.id ?? null)

  const [modus, setModus] = useState<'lesen' | 'bearbeiten' | 'neu' | 'import'>('lesen')

  const [importStand, setImportStand] = useState<{
    dateiName: string
    tabellen: DtkTabelle[]
    pannenGrund?: string
  } | null>(null)
  const dateiRef = useRef<HTMLInputElement>(null)

  async function dtkGewaehlt(datei: File) {
    let tabellen: DtkTabelle[]
    let pannenGrund: string | undefined
    try {
      tabellen = dtkLesen(new Uint8Array(await datei.arrayBuffer()))
    } catch (fehler) {
      tabellen = []
      pannenGrund = fehler instanceof Error ? fehler.message : String(fehler)
    }
    setImportStand({ dateiName: datei.name, tabellen, pannenGrund })
    setModus('import')
  }

  const auswahl = store.list.find((s) => s.id === auswahlId) ?? store.list[0]

  const verwendungFor = (id: string): string[] =>
    bausteineMitQuelle(ed.tree, id).map((n) => bausteinName(n, store.list))

  const unvollstaendig = (s: Datenquelle): boolean =>
    artFuer(s.kind).felderEinzeln && s.fields.length === 0

  const kennung = (s: Datenquelle): string => quellenKennung(s)

  // Die Kopie ist eigenstaendig; Bausteine zeigen weiter auf das Original.
  // store.add klont tief und setzt die eigene Kennung zuletzt.
  function dupliziere(s: Datenquelle) {
    const kopie = store.add({
      ...s,
      name: kopieName(s.name, store.list.map((q) => q.name)),
    })
    setAuswahlId(kopie.id)
    setModus('lesen')
  }

  // Ohne Rueckfrage: Strg+Z holt die Quelle zurueck. Bausteine, die sie benutzen,
  // bleiben stehen; ihre Daten-Bindungen ruhen.
  function loeschen(s: Datenquelle) {
    store.remove(s.id)
    setModus('lesen')
  }

  return (
    <>
      <ListeDetail
        bereiche={bereiche}
        listeKopf={(
          <>
          <Knopf className="w-full" onClick={() => setModus('neu')}>
            <Plus size={14} /> Neue Datenquelle
          </Knopf>
          <Knopf className="w-full" onClick={() => dateiRef.current?.click()}>
            <FileUp size={14} /> Aus SoftEngine-Datei…
          </Knopf>

          <input
            ref={dateiRef}
            type="file"
            accept=".dtk"
            className="hidden"
            onChange={(e) => {
              const datei = e.target.files?.[0]
              try {
                if (datei) void dtkGewaehlt(datei)
              } finally {
                e.target.value = ''
              }
            }}
          />
          </>
        )}
        liste={(
          <>
          {store.list.map((s) => {
            const verwendet = verwendungFor(s.id).length
            const aktiv =
              (modus === 'lesen' || modus === 'bearbeiten') && auswahl?.id === s.id
            const Icon = ikonFuer(s.kind)
            return (
              <Eintrag
                key={s.id}
                icon={Icon}
                name={s.name}
                aktiv={aktiv}
                onClick={() => { setAuswahlId(s.id); setModus('lesen') }}
                rechts={(
                  <>
                    {unvollstaendig(s) && (
                      <TriangleAlert size={12} className="shrink-0 text-fehler" />
                    )}
                    <Marke technisch={false}>{quellenWorte(s.kind).name}</Marke>
                  </>
                )}
                unten={(
                  <>
                    {kennung(s) !== '' && (
                      <span className="font-mono">{kennung(s)} · </span>
                    )}
                    {s.fields.length} Felder · {verwendet > 0 ? `verwendet von ${verwendet}` : 'nicht verwendet'}
                  </>
                )}
              />
            )
          })}
          {store.list.length === 0 && (
            <p className="px-1 py-2 text-dicht text-matt">
              Noch keine Datenquellen.
            </p>
          )}
          </>
        )}
        detail={(
          <>
        {modus === 'neu' && (
          <DataSourceForm onClose={() => setModus('lesen')} />
        )}
        {modus === 'import' && importStand && (
          <DtkImportForm
            dateiName={importStand.dateiName}
            tabellen={importStand.tabellen}
            pannenGrund={importStand.pannenGrund}
            onClose={() => setModus('lesen')}
          />
        )}
        {modus === 'bearbeiten' && auswahl && (
          <DataSourceForm source={auswahl} onClose={() => setModus('lesen')} />
        )}
        {modus === 'lesen' && !auswahl && (
          <p className="text-dicht text-matt">Keine Datenquelle gewählt.</p>
        )}
        {modus === 'lesen' && auswahl && (
          <div className="flex flex-col gap-4 text-ui">
            <div>
              <h3 className="text-ui font-semibold text-tinte">{auswahl.name}</h3>
              <p className="text-matt">
                {quellenWorte(auswahl.kind).name}
                {kennung(auswahl) !== '' ? ` · ${kennung(auswahl)}` : ''}
              </p>
            </div>

            <Gruppe titel="Felder">
              <div className="overflow-hidden rounded border border-linie">
                <table className="w-full">
                  <tbody>
                    {auswahl.fields.map((f) => (
                      <tr key={f.code} className="border-b border-linie last:border-b-0">
                        <td className="px-2.5 py-1">{f.label}</td>
                        <td className="px-2.5 py-1 text-right font-mono text-dicht text-matt">
                          {f.code}
                        </td>
                      </tr>
                    ))}
                    {auswahl.fields.length === 0 && (
                      <tr><td className="px-2.5 py-1 text-matt">Keine Felder.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Gruppe>

            <Gruppe titel="Verwendung in dieser Maske">
              {verwendungFor(auswahl.id).length === 0 ? (
                <p className="text-matt">Von keinem Baustein verwendet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {verwendungFor(auswahl.id).map((name, i) => (
                    <li key={i} className="rounded border border-linie bg-control px-2.5 py-1">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Gruppe>

            <div className="flex gap-2 border-t border-linie pt-3">
              <Knopf art="primaer" onClick={() => setModus('bearbeiten')}>Bearbeiten</Knopf>
              <Knopf onClick={() => dupliziere(auswahl)}>Duplizieren</Knopf>
              <Knopf art="gefahr" onClick={() => loeschen(auswahl)}>Löschen</Knopf>
            </div>
          </div>
        )}
          </>
        )}
      />
    </>
  )
}
