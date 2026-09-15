// „Folgt der Auswahl von …" im Inspector.
import { Gruppe } from '@/editor/werkbank/Gruppe'
import type { ListeEintrag } from '@/editor/werkbank/Liste'
import type { Baustein } from '../../kern/maske/baum'
import { auswahlQuelleIdVon, istAuswahlGeber } from '../../kern/maske/baumFragen'
import {
  AUSWAHL_FOLGE_PROP,
  auswahlFolgenAus,
  folgeBrauchbar,
  type AuswahlFolge,
} from '../../kern/daten/auswahlFolge'
import { ladeRelationVon, quellenKennung } from '../../kern/daten/datenquellen'
import { useDataSources } from '../zustand/useDataSources'
import { useEditor } from '../zustand/useEditor'
import { bausteinName } from '../../kern/maske/bausteinName'
import { useAbschnitt } from './abschnittStand'
import { PickerControl } from './controls/PickerControl'
import { SchluesselPaarZeilen } from './SchluesselPaarZeilen'

interface AuswahlFolgeSektionProps {
  block: Baustein
}

export function AuswahlFolgeSektion({ block }: AuswahlFolgeSektionProps) {
  const [offen, schalte] = useAbschnitt('auswahlFolgen')
  const ed = useEditor()
  const bibliothek = useDataSources().list

  const folge: AuswahlFolge | undefined = auswahlFolgenAus(block.werte[AUSWAHL_FOLGE_PROP])[0]

  const kandidaten = Object.values(ed.tree).filter(
    (n) => n.id !== block.id && istAuswahlGeber(n),
  )

  if (kandidaten.length === 0 && !folge) return null

  const quelleVon = (n: Baustein | undefined) =>
    bibliothek.find((s) => s.id === auswahlQuelleIdVon(n))
  const eigeneQuelle = quelleVon(block)
  const geberNode = folge ? ed.tree[folge.geberId] : undefined
  const geberQuelle = quelleVon(geberNode)

  // Eine holende Quelle fragt fuer die gewaehlte Zeile; die Schluessel dafuer
  // nennt ihre Relation selbst. Verbindende Felder sind dort kein Muss, sondern
  // ein zusaetzlicher Filter ueber das Geholte.
  const holtZeilen = eigeneQuelle !== undefined && ladeRelationVon(eigeneQuelle) !== null

  const eintrag = (n: Baustein): ListeEintrag => {
    const q = quelleVon(n)
    return q
      ? { wert: n.id, name: `${bausteinName(n, bibliothek)} (${q.name})`, kennung: quellenKennung(q) }
      : { wert: n.id, name: bausteinName(n, bibliothek) }
  }

  function setze(neu: AuswahlFolge[]): void {
    ed.updateProperty(block.id, AUSWAHL_FOLGE_PROP, neu)
  }
  function setzeGeber(v: string): void {
    if (v === '') {
      setze([])
      return
    }
    const keyPairs = folge && folge.paare.length > 0 ? folge.paare : []
    setze([{
      geberId: v,
      paare: holtZeilen || keyPairs.length > 0 ? keyPairs : [{ vonFeld: '', nachFeld: '' }],
    }])
  }
  return (
    <Gruppe titel="Auswahl folgen" offen={offen} onSchalte={schalte}>
      {/* Ein geloeschter Geber braucht keine Kunst-Option: der Waehler zeigt
          einen Wert, den er nicht kennt, von sich aus rot. */}
      <PickerControl
        label="Folgt der Auswahl von"
        bezeichnung="Folgt der Auswahl von"
        gruppen={[{ key: 'geber', eintraege: kandidaten.map(eintrag) }]}
        wert={folge?.geberId ?? ''}
        leerText="Keiner"
        onWaehle={setzeGeber}
      />
      {folge && (
        <>
          {holtZeilen && (
            <p className="text-dicht text-matt">
              Diese Quelle holt ihre Zeilen zum hier gewählten Satz. Verbindende
              Felder sind kein Muss — gesetzt, filtern sie das Geholte zusätzlich.
            </p>
          )}
          <SchluesselPaarZeilen
            frage="Verbindende Felder"
            paare={folge.paare}
            linkeFelder={geberQuelle?.felder ?? []}
            rechteFelder={eigeneQuelle?.felder ?? []}
            linkeBezeichnung={(at) => `Feld ${at + 1} beim Auswahl-Geber`}
            rechteBezeichnung={(at) => `Feld ${at + 1} in diesem Baustein`}
            entfernenBezeichnung={(at) => `Feldpaar ${at + 1} entfernen`}
            onAendern={(keyPairs) => setze([{ ...folge, paare: keyPairs }])}
          />

          {(!geberQuelle || !eigeneQuelle) && (
            <p className="text-dicht text-matt">Beide Bausteine brauchen eine Datenquelle.</p>
          )}
          {geberQuelle && eigeneQuelle && !holtZeilen && !folgeBrauchbar(folge) && (
            <p className="text-dicht text-matt">Ein Feldpaar ist noch halb leer.</p>
          )}
        </>
      )}
    </Gruppe>
  )
}
