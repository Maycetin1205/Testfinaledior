// Der Inspector: die Einstellungen des gewaehlten Bausteins.
import { useMemo, type ReactNode } from 'react'
import { Copy, MousePointer2 } from '@/ui/zeichen'
import { eigenschaftenFuer } from '../../core/blocks/eigenschaftsOrt'
import { getBlockDefinition } from '../../core/blocks/blockRegistry'
import { type PropertyDescription } from '../../core/blocks/PropertyDescription'
import {
  darfAuswahlFolgen,
  kannGruppenRechnen,
  kannRechnen,
  traegtEigeneQuelle,
} from '../../core/blocks/treeQuery'
import { useDataSources } from '../../state/useDataSources'
import { useEditor } from '../../state/useEditor'
import { Gruppe } from '@/ui/werkbank/Gruppe'
import { Knopf } from '@/ui/werkbank/Knopf'
import { Zeile } from '@/ui/werkbank/Zeile'
import { bausteinName } from '../../core/blocks/bausteinName'
import { useAbschnitt } from './abschnittStand'
import { AktionenSektion } from './AktionenSektion'
import { AuswahlFolgeSektion } from './AuswahlFolgeSektion'
import { BerechnungSektion } from './BerechnungSektion'
import { PropControl } from './PropControl'
import { QuellenListe } from './QuellenListe'
import { RechnungSektion } from './RechnungSektion'

interface InspectorZeile {
  row?: string
  props: PropertyDescription[]
}

function inspectorZeilen(props: PropertyDescription[]): InspectorZeile[] {
  const zeilen: InspectorZeile[] = []
  for (const p of props) {
    const letzte = zeilen[zeilen.length - 1]
    if (p.inspectorRow && letzte?.row === p.inspectorRow) letzte.props.push(p)
    else zeilen.push({ row: p.inspectorRow, props: [p] })
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
  const [felderOffen, schalteFelder] = useAbschnitt('felder')
  const [aktionenOffen, schalteAktionen] = useAbschnitt('aktionen')
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

  const def = getBlockDefinition(block.type)

  if (!def) {
    return (
      <Panel titel="Inspector">
        <p className="text-dicht text-fehler">
          Keine Definition für Block-Typ &quot;{block.type}&quot; gefunden.
        </p>
      </Panel>
    )
  }

  const blockName = bausteinName(block, quellen.list)

  const sourceInReach = ed.dataSourceFor(block.id)

  const propControl = (property: PropertyDescription, kompakt = false) => (
    <PropControl
      key={property.attributeName}
      block={block}
      property={property}
      sourceInReach={sourceInReach}
      sitzung={sitzung}
      kompakt={kompakt}
    />
  )

  const visibleProps = eigenschaftenFuer(block, def, 'inspector')

  // Nach unten wandert nur, was WIRKLICH auf ein Feld, eine Quelle oder eine
  // Relation zeigt. `requiresDataSource` gehoert nicht dazu: es steckt auch an
  // gewoehnlichen Ja/Nein-Schaltern, die sonst auf zwei Seiten des Trennstrichs
  // laegen.
  const dataProps = visibleProps.filter(
    (p) => p.kind === 'field' || p.kind === 'quelle' || p.kind === 'relation',
  )
  const generalProps = visibleProps.filter((p) => !dataProps.includes(p))

  // Getrennt nach FORM, nicht nach Thema: ein Ja/Nein ist eine Kachel und steht
  // neben seinesgleichen, ein Wert ist eine Zeile mit Beschriftung darueber.
  const kachelProps = generalProps.filter((p) => p.kind === 'jaNein')
  const wertProps = generalProps.filter((p) => p.kind !== 'jaNein')

  const showDataSection = traegtEigeneQuelle(block) || dataProps.length > 0

  const hatAktionen = def.blockEvents !== undefined && def.blockEvents.length > 0

  return (
    <Panel
      titel={blockName}
      aktionen={(
        <Knopf
          nurZeichen
          aria-label="Duplizieren (Ctrl+D)"
          title="Duplizieren (Ctrl+D)"
          onClick={() => ed.duplicateBlock(block.id)}
          disabled={ed.isRemoveProtected(block.id)}
        >
          <Copy size={14} />
        </Knopf>
      )}
    >
      <div className="flex flex-col gap-4">
        {kachelProps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {kachelProps.map((p) => propControl(p))}
          </div>
        )}

        {wertProps.length > 0 && (
          <div className="inspektor-werte">
            {inspectorZeilen(wertProps).map((zeile) =>
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

        {showDataSection && (
          <div className="flex flex-col gap-4">
            {traegtEigeneQuelle(block) && <QuellenListe block={block} />}
            {/* Eigene Ueberschrift: ohne sie standen die Datenfelder optisch
                INNERHALB der Gruppe „Datenquellen" und lasen sich wie deren
                Einstellungen — beim Kanban sah der ganze Inspector nach
                Datenquelle aus. */}
            {dataProps.length > 0 && (
              <Gruppe titel="Felder" offen={felderOffen} onSchalte={schalteFelder}>
                <div className="inspektor-werte">
                  {dataProps.map((p) => propControl(p))}
                </div>
              </Gruppe>
            )}
          </div>
        )}

        {/* Eine Berechnung besteht aus Spalten und Datenfeldern und steht darum
            bei ihnen, nicht hinter den Ketten am Ende des Inspectors. */}
        {kannGruppenRechnen(block) && <BerechnungSektion block={block} />}

        {darfAuswahlFolgen(block) && <AuswahlFolgeSektion block={block} />}

        {hatAktionen && (
          <Gruppe titel="Aktionen" offen={aktionenOffen} onSchalte={schalteAktionen}>
            <AktionenSektion block={block} events={def.blockEvents ?? []} />
          </Gruppe>
        )}

        {/* Zielbild-Reihenfolge: ... Aktionen -> Rechnung (nur die Erfassung). */}
        {kannRechnen(block) && <RechnungSektion block={block} />}

        {generalProps.length === 0 && !showDataSection && !hatAktionen
          && !darfAuswahlFolgen(block) && (
            // Sonst steht der Bediener vor einer leeren Flaeche und weiss nicht,
            // ob der Baustein nichts kann oder der Editor kaputt ist.
          <p className="text-ui text-matt">Gestaltung direkt am Baustein. Hier sind keine weiteren Daten- oder Verhaltenseinstellungen nötig.</p>
        )}

      </div>
    </Panel>
  )
}
