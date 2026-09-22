// Der Inspector: die Einstellungen des gewaehlten Bausteins.
import { useMemo, useState, type ReactNode } from 'react'
import { Copy, MousePointer2 } from '@/editor/zeichen/zeichen'
import { eigenschaftenFuer } from '../../kern/maske/eigenschaftsOrt'
import { bausteinArt } from '../../kern/maske/registry'
import { faehigkeit } from '../../kern/maske/faehigkeiten'
import { abschnittVon, type Eigenschaft, type InspectorAbschnitt } from '../../kern/maske/eigenschaft'
import { darfAuswahlFolgen, traegtEigeneQuelle } from '../../kern/maske/baumFragen'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'
import { Reiter } from '@/editor/werkbank/Reiter'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Zeile } from '@/editor/werkbank/Zeile'
import { bausteinName } from '../../kern/maske/bausteinName'
import { kapazitaetVon } from '../canvas/rasterFlaeche'
import { AktionenSektion } from './AktionenSektion'
import { AuswahlFolgeSektion } from './AuswahlFolgeSektion'
import { PropControl } from './PropControl'
import { QuellenListe } from './QuellenListe'
import { SuchfensterSektion } from './SuchfensterSektion'

// Dieselben vier Reiter in derselben Reihenfolge fuer jeden Baustein; ein Reiter
// ohne Inhalt faellt weg.
type InspectorReiter = InspectorAbschnitt | 'aktionen'

const REITER: readonly { id: InspectorReiter; name: string }[] = [
  { id: 'daten', name: 'Daten' },
  { id: 'inhalt', name: 'Inhalt' },
  { id: 'aussehen', name: 'Aussehen' },
  { id: 'aktionen', name: 'Aktionen' },
]

interface InspectorZeile {
  row?: string
  props: Eigenschaft[]
}

function inspectorZeilen(props: Eigenschaft[]): InspectorZeile[] {
  const zeilen: InspectorZeile[] = []
  for (const p of props) {
    const letzte = zeilen[zeilen.length - 1]
    if (p.zeile && letzte?.row === p.zeile) letzte.props.push(p)
    else zeilen.push({ row: p.zeile, props: [p] })
  }
  return zeilen
}

function Panel({ titel, aktionen, children }: {
  titel: string
  aktionen?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <header className="flex h-steuer shrink-0 items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate text-ui font-semibold text-tinte">{titel}</h2>
        {aktionen}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function Inspector() {
  // Vor jedem fruehen `return`: Hooks laufen in jedem Durchgang gleich oft.
  const [reiter, setReiter] = useState<InspectorReiter>('daten')
  const ed = useEditor()

  const quellen = useDataSources()

  const sitzung = useMemo(() => ({
    onBeginBearbeitung: () => ed.beginTransaction(),
    onEndeBearbeitung: () => ed.endTransaction(),
  }), [ed])
  const block = ed.selectedNode

  if (!block) {
    return (
      <Panel titel="Inspector">
        <div className="flex flex-col items-center gap-1.5 rounded border border-dashed border-linie px-6 py-6 text-center">
          <MousePointer2 size={18} aria-hidden className="text-matt" />
          <p className="text-ui text-tinte">Kein Baustein gewählt.</p>
          <p className="text-dicht text-matt">Wähle einen Baustein auf der Fläche.</p>
        </div>
      </Panel>
    )
  }

  const def = bausteinArt(block.typ)

  if (!def) {
    return (
      <Panel titel="Inspector">
        <p className="text-dicht text-fehler">
          Keine Definition für Block-Typ &quot;{block.typ}&quot; gefunden.
        </p>
      </Panel>
    )
  }

  const blockName = bausteinName(block, quellen.list)

  const sourceInReach = ed.dataSourceFor(block.id)

  const propControl = (property: Eigenschaft, kompakt = false) => (
    <PropControl
      key={property.schluessel}
      block={block}
      property={property}
      sourceInReach={sourceInReach}
      sitzung={sitzung}
      kompakt={kompakt}
    />
  )

  const visibleProps = eigenschaftenFuer(block, def, 'inspector')
  const imAbschnitt = (a: InspectorAbschnitt): Eigenschaft[] => visibleProps.filter((p) => abschnittVon(p) === a)

  const ereignisse = faehigkeit(def, 'ereignisse')?.liste ?? []

  // Das Suchfenster bringt die Faehigkeit Nachschlagen mit; gefragt wird sie,
  // nicht der Bausteintyp.
  const suchFenster = faehigkeit(def, 'suchfenster')?.fenster
  const eigeneQuelle = traegtEigeneQuelle(block)
  const folgt = darfAuswahlFolgen(block)

  // Getrennt nach FORM: ein Ja/Nein ist eine Kachel neben seinesgleichen, ein
  // Wert eine Zeile, eine Liste bekommt eine eigene Ueberschrift.
  const darstellen = (props: Eigenschaft[]): ReactNode => {
    const gruppen = [...new Set(props.map((p) => p.gruppe ?? ''))]
    return gruppen.map((gruppe) => {
      const eigene = props.filter((p) => (p.gruppe ?? '') === gruppe)
      const kacheln = eigene.filter((p) => p.art === 'jaNein')
      const listen = eigene.filter((p) => p.art === 'eintraege')
      const werte = eigene.filter((p) => p.art !== 'jaNein' && p.art !== 'eintraege')
      return (
        <section key={gruppe} className="flex flex-col gap-2">
          {gruppe !== '' && <h3 className="text-ui font-semibold text-tinte">{gruppe}</h3>}
          {kacheln.length > 0 && <div className="flex flex-wrap gap-1.5">{kacheln.map((p) => propControl(p))}</div>}
          {werte.length > 0 && (
            <div className="inspektor-werte">
              {inspectorZeilen(werte).map((zeile) =>
                zeile.row ? (
                  <Zeile key={`zeile:${zeile.row}`} label={zeile.row}>
                    {() => (
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {zeile.props.map((p) => propControl(p, true))}
                      </div>
                    )}
                  </Zeile>
                ) : (
                  propControl(zeile.props[0])
                ),
              )}
            </div>
          )}
          {listen.map((p) => (
            <div key={p.schluessel} className="flex flex-col gap-1.5">
              <h3 className="text-ui font-semibold text-tinte" title={p.beschreibung}>{p.name}</h3>
              {propControl(p)}
            </div>
          ))}
        </section>
      )
    })
  }

  const datenProps = imAbschnitt('daten')
  const inhaltProps = imAbschnitt('inhalt')
  const aussehenProps = imAbschnitt('aussehen')
  const reiterInhalt: Record<InspectorReiter, ReactNode | null> = {
    daten: eigeneQuelle || datenProps.length > 0 || suchFenster !== undefined || folgt ? (
      <>
        {eigeneQuelle && <QuellenListe block={block} />}
        {darstellen(datenProps)}
        {suchFenster && <SuchfensterSektion block={block} fenster={suchFenster} />}
        {folgt && <AuswahlFolgeSektion block={block} />}
      </>
    ) : null,
    inhalt: inhaltProps.length > 0 ? darstellen(inhaltProps) : null,
    aussehen: aussehenProps.length > 0 ? darstellen(aussehenProps) : null,
    aktionen: ereignisse.length > 0 ? <AktionenSektion block={block} events={ereignisse} /> : null,
  }
  const vorhanden = REITER.filter((r) => reiterInhalt[r.id] !== null)
  const aktiv = vorhanden.find((r) => r.id === reiter) ?? vorhanden[0]

  return (
    <Panel
      titel={blockName}
      aktionen={(
        <Knopf
          nurZeichen
          aria-label="Duplizieren (Ctrl+D)"
          title="Duplizieren (Ctrl+D)"
          onClick={() => ed.duplicateBlock(block.id, kapazitaetVon(ed.tree, block.elternId))}
          disabled={ed.isRemoveProtected(block.id)}
        >
          <Copy size={14} />
        </Knopf>
      )}
    >
      <div className="flex flex-col gap-4">
        {vorhanden.length > 0 && (
          <div className="flex gap-1 border-b border-linie pb-2" role="tablist">
            {vorhanden.map((r) => (
              <Reiter key={r.id} aktiv={r.id === aktiv?.id} onClick={() => setReiter(r.id)}>{r.name}</Reiter>
            ))}
          </div>
        )}
        {aktiv && reiterInhalt[aktiv.id]}
        {!aktiv && (
          // Sonst steht der Bediener vor einer leeren Flaeche und weiss nicht,
          // ob der Baustein nichts kann oder der Editor kaputt ist.
          <p className="text-ui text-matt">Gestaltung direkt am Baustein. Hier sind keine weiteren Daten- oder Verhaltenseinstellungen nötig.</p>
        )}
      </div>
    </Panel>
  )
}
